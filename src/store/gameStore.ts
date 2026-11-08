import { create } from 'zustand'
import {
  caseList,
  demoCase,
  getCaseDefinition,
  getPlayableCharacters,
  getPoliceCharacter,
} from '../game/cases'
import {
  canDiscoverEvidence,
  getEvidenceById,
  getInitialEvidence,
  makeTurn,
  scoreVerdict,
} from '../game/logic'
import { createInitialVerdictRoles } from '../game/verdict'
import type {
  AI2StructuredSummary,
  ConversationTurn,
  GamePhase,
  InvestigationSession,
  PlayerVerdict,
  SummaryType,
} from '../game/types'

export function newSession(
  caseId = demoCase.id,
  phase: GamePhase = 'home',
): InvestigationSession {
  const c = getCaseDefinition(caseId)
  return {
    sessionId: crypto.randomUUID(),
    phase,
    currentCaseId: caseId,
    activeCharacterId: getPlayableCharacters(c)[0].id,
    questionMode: 'single',
    draft: '',
    turns: [],
    revealedEvidenceIds: getInitialEvidence(c).map((e) => e.id),
    discoveredEvidenceIds: [],
    latestSummary: '',
    verdictRoles: createInitialVerdictRoles(c.characters),
    reportStep: 0,
  }
}
interface GameState extends InvestigationSession {
  useMockAI: false
  setPhase: (phase: GamePhase) => void
  goToCaseSelect: () => void
  openCase: (caseId: string) => void
  setActiveCharacter: (id: string) => void
  startRoundtable: () => void
  addTurn: (turn: ConversationTurn) => void
  selectQuote: (id: string) => void
  clearQuote: () => void
  discoverEvidence: (ids: string[]) => void
  revealEvidence: (id: string) => void
  setSummary: (
    summary: string,
    type: SummaryType,
    structured?: AI2StructuredSummary,
  ) => void
  submitVerdict: (verdict: PlayerVerdict) => void
  resetGame: () => void
  restoreSession: (session: InvestigationSession) => void
}
const cleared = {
  selectedQuote: undefined,
  latestStructuredSummary: undefined,
  verdict: undefined,
  result: undefined,
  round: undefined,
}
export const useGameStore = create<GameState>((set, get) => ({
  ...newSession(),
  useMockAI: false,
  setPhase: (phase) => set({ phase }),
  goToCaseSelect: () => set({ phase: 'case_select' }),
  openCase: (id) => {
    if (caseList.some((c) => c.id === id && c.status === 'unlocked'))
      set({ ...cleared, ...newSession(id, 'report') })
  },
  setActiveCharacter: (id) => {
    if (
      getPlayableCharacters(getCaseDefinition(get().currentCaseId)).some(
        (c) => c.id === id,
      )
    )
      set({ activeCharacterId: id })
  },
  startRoundtable: () => {
    const c = getCaseDefinition(get().currentCaseId)
    if (get().turns.length) {
      set({ phase: 'roundtable' })
      return
    }
    set({
      phase: 'roundtable',
      turns: c.characters.map((p) =>
        makeTurn(
          p.id,
          p.openingStatement,
          p.roleType === 'police' ? 'police_control' : 'opening',
        ),
      ),
    })
  },
  addTurn: (turn) =>
    set((s) =>
      s.turns.some((t) => t.id === turn.id)
        ? {}
        : { turns: [...s.turns, turn] },
    ),
  selectQuote: (id) =>
    set((s) => ({
      selectedQuote: s.turns.find(
        (t) => t.id === id && t.turnType !== 'ai2_summary',
      ),
    })),
  clearQuote: () => set({ selectedQuote: undefined }),
  discoverEvidence: (ids) =>
    set((s) => ({
      discoveredEvidenceIds: [
        ...s.discoveredEvidenceIds,
        ...ids.filter(
          (id, i) =>
            ids.indexOf(id) === i &&
            canDiscoverEvidence(
              getCaseDefinition(s.currentCaseId),
              id,
              s.revealedEvidenceIds,
              s.discoveredEvidenceIds,
            ),
        ),
      ],
    })),
  revealEvidence: (id) =>
    set((s) => {
      const c = getCaseDefinition(s.currentCaseId),
        e = getEvidenceById(c, id),
        police = getPoliceCharacter(c)
      if (
        !e ||
        s.revealedEvidenceIds.includes(id) ||
        !s.discoveredEvidenceIds.includes(id) ||
        !(e.requiresEvidenceIds || []).every((r) =>
          s.revealedEvidenceIds.includes(r),
        )
      )
        return {}
      return {
        revealedEvidenceIds: [...s.revealedEvidenceIds, id],
        turns: [
          ...s.turns,
          makeTurn(
            police?.id || 'police',
            `核实结果：${e.title}。${e.content}`,
            'police_control',
            id,
          ),
        ],
      }
    }),
  setSummary: (latestSummary, _type, latestStructuredSummary) =>
    set({ latestSummary, latestStructuredSummary }),
  submitVerdict: (verdict) => {
    const c = getCaseDefinition(get().currentCaseId),
      ids = [
        ...verdict.culpritIds,
        ...verdict.accompliceIds,
        ...verdict.innocentIds,
      ]
    const expected = getPlayableCharacters(c).map((p) => p.id)
    if (
      ids.length !== expected.length ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !expected.includes(id))
    )
      return
    set({ verdict, result: scoreVerdict(c, verdict), phase: 'result' })
  },
  resetGame: () => set({ ...cleared, ...newSession() }),
  restoreSession: (session) =>
    set({ ...cleared, ...session, sessionId: crypto.randomUUID() }),
}))
export function snapshotSession(): InvestigationSession {
  const s = useGameStore.getState()
  return JSON.parse(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(s).filter(
          ([key, value]) => typeof value !== 'function' && key !== 'useMockAI',
        ),
      ),
    ),
  )
}
