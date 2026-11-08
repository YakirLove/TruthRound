import { create } from 'zustand'
import { useGameStore } from '../store/gameStore'
import { getCaseDefinition, getPlayableCharacters } from './cases'
import { aiTransport, type AITransport } from './aiClient'
import {
  buildPlayerKnowledge,
  canDiscoverEvidence,
  formatAI2StructuredSummary,
  groundStructuredSummary,
  makeTurn,
  parseAI2StructuredSummary,
  parseTriggeredEvidenceIds,
} from './logic'
import type { AIRequest } from './types'
export const useRequestStore = create<{
  busy: boolean
  label: string
  error: string
  retry: 'question' | 'summary' | null
}>(() => ({ busy: false, label: '', error: '', retry: null }))
let controller: AbortController | undefined
let generation = 0
let activeKind: 'question' | 'summary' = 'question'
export function cancelInvestigation() {
  generation++
  controller?.abort()
  controller = undefined
  useRequestStore.setState({
    busy: false,
    label: '',
    error: '请求已取消，已完成的口供仍保留。',
    retry: activeKind,
  })
}
useGameStore.subscribe((s, previous) => {
  if (
    s.sessionId !== previous.sessionId ||
    (previous.phase === 'roundtable' && s.phase !== 'roundtable')
  ) {
    generation++
    controller?.abort()
    controller = undefined
    useRequestStore.setState({ busy: false, label: '', error: '', retry: null })
  }
})
export async function runInvestigation(
  kind: 'question' | 'summary',
  retry = false,
  transport: AITransport = aiTransport,
) {
  if (useRequestStore.getState().busy) return
  let state = useGameStore.getState()
  if (state.phase !== 'roundtable') return
  const c = getCaseDefinition(state.currentCaseId)
  if (kind === 'question' && !retry && !state.draft.trim()) return
  activeKind = kind
  const token = ++generation,
    sessionId = state.sessionId
  const local = new AbortController()
  controller = local
  const valid = () =>
    generation === token &&
    useGameStore.getState().sessionId === sessionId &&
    !local.signal.aborted
  const request = async (
    mode: AIRequest['mode'],
    extra: Partial<AIRequest> = {},
  ) => {
    const current = useGameStore.getState()
    return transport.request(
      {
        mode,
        caseId: c.id,
        sessionId,
        requestId: crypto.randomUUID(),
        conversationHistory: current.turns,
        revealedEvidenceIds: current.revealedEvidenceIds,
        discoveredEvidenceIds: current.discoveredEvidenceIds,
        ...extra,
      },
      local.signal,
    )
  }
  useRequestStore.setState({
    busy: true,
    error: '',
    retry: null,
    label: kind === 'summary' ? '正在整理侦探札记…' : '正在问话…',
  })
  try {
    if (kind === 'summary') {
      const knowledge = buildPlayerKnowledge({
        caseDefinition: c,
        conversationHistory: state.turns,
        revealedEvidenceIds: state.revealedEvidenceIds,
      })
      const answer = await request('assistant_summary')
      if (!valid()) return
      const summary = groundStructuredSummary(
        parseAI2StructuredSummary(
          answer.content,
          knowledge.sources.map((s) => s.id),
        ),
        knowledge,
      )
      useGameStore
        .getState()
        .setSummary(formatAI2StructuredSummary(summary), 'timeline', summary)
    } else {
      if (!retry || !state.round) {
        const targets =
          state.questionMode === 'all'
            ? getPlayableCharacters(c).map((p) => p.id)
            : [state.activeCharacterId]
        const round = {
          id: crypto.randomUUID(),
          question: state.draft.trim(),
          targetIds: targets,
          completedIds: [],
          failedIds: targets,
          quote: state.selectedQuote,
          evidenceChecked: false,
        }
        state.addTurn(
          makeTurn(
            'player',
            round.question,
            'player_question',
            state.questionMode === 'all' ? 'all' : state.activeCharacterId,
            state.selectedQuote,
          ),
        )
        useGameStore.setState({ round, draft: '', selectedQuote: undefined })
      }
      state = useGameStore.getState()
      const round = state.round!
      for (const id of round.targetIds.filter(
        (id) => !round.completedIds.includes(id),
      )) {
        if (!valid()) return
        const name = c.characters.find((p) => p.id === id)!.name
        useRequestStore.setState({
          label: `等待${name}回应（${useGameStore.getState().round!.completedIds.length + 1}/${round.targetIds.length}）…`,
        })
        useGameStore.setState({ activeCharacterId: id })
        try {
          const answer = await request('roleplay', {
            characterId: id,
            playerQuestion: round.question,
            quotedTurn: round.quote,
          })
          if (!valid()) return
          const current = useGameStore.getState()
          current.addTurn({
            ...makeTurn(id, answer.content, 'character_answer'),
            id: `${round.id}:${id}`,
          })
          useGameStore.setState({
            round: {
              ...current.round!,
              completedIds: [...current.round!.completedIds, id],
              failedIds: current.round!.failedIds.filter((p) => p !== id),
              evidenceChecked: false,
            },
          })
        } catch (e) {
          if (!valid()) return
          useRequestStore.setState({
            error: `${name}未能回应：${e instanceof Error ? e.message : '连接失败'}`,
            retry: 'question',
          })
        }
      }
      if (!valid()) return
      state = useGameStore.getState()
      if (!state.round!.evidenceChecked) {
        const allowed = c.evidence
          .filter((e) =>
            canDiscoverEvidence(
              c,
              e.id,
              state.revealedEvidenceIds,
              state.discoveredEvidenceIds,
            ),
          )
          .map((e) => e.id)
        if (allowed.length) {
          useRequestStore.setState({ label: '正在核对可查证方向…' })
          const answer = await request('evidence_check')
          if (!valid()) return
          useGameStore
            .getState()
            .discoverEvidence(
              parseTriggeredEvidenceIds(answer.content, allowed),
            )
        }
        useGameStore.setState((s) => ({
          round: { ...s.round!, evidenceChecked: true },
        }))
      }
    }
  } catch (e) {
    if (valid())
      useRequestStore.setState({
        error: e instanceof Error ? e.message : '请求失败，请重试。',
        retry: kind,
      })
  } finally {
    if (generation === token) {
      controller = undefined
      useRequestStore.setState({ busy: false, label: '' })
    }
  }
}
