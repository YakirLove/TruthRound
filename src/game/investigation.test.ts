import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../store/gameStore'
import {
  runInvestigation,
  useRequestStore,
  cancelInvestigation,
} from './investigation'
import {
  buildAI2Payload,
  buildAI1Payload,
  parseAI2StructuredSummary,
  groundStructuredSummary,
} from './logic'
import { demoCase, wutongClinicCase } from './cases'
import type { AITransport } from './aiClient'
import type { AIRequest, AIResponse } from './types'
beforeEach(() => {
  useGameStore.getState().resetGame()
  useGameStore.getState().openCase(demoCase.id)
  useGameStore.getState().startRoundtable()
})
describe('investigation boundaries and recovery', () => {
  it('does not reveal undiscovered or prerequisite-blocked evidence', () => {
    const s = useGameStore.getState()
    s.revealEvidence('tire-scratch')
    expect(useGameStore.getState().revealedEvidenceIds).not.toContain(
      'tire-scratch',
    )
    s.openCase(wutongClinicCase.id)
    s.discoverEvidence(['ring-in-gum', 'unknown'])
    expect(useGameStore.getState().discoveredEvidenceIds).toEqual([])
    s.discoverEvidence(['gum-under-counter'])
    s.revealEvidence('gum-under-counter')
    s.discoverEvidence(['ring-in-gum'])
    s.revealEvidence('ring-in-gum')
    expect(useGameStore.getState().revealedEvidenceIds).toContain('ring-in-gum')
  })
  it('never sends the clinic hidden truth after verifying only the wrapper', () => {
    const c = wutongClinicCase
    const payload = buildAI2Payload({
      caseDefinition: c,
      conversationHistory: [],
      revealedEvidenceIds: [
        ...c.evidence.filter((e) => e.stage === 'initial').map((e) => e.id),
        'gum-wrapper',
      ],
      discoveredEvidenceIds: ['gum-wrapper', 'gum-under-counter'],
    })
    expect(payload.sources.map((s) => s.id)).not.toContain('gum-under-counter')
    const serialized = JSON.stringify(payload)
    for (const e of c.evidence.filter((e) =>
      ['gum-under-counter', 'ring-in-gum'].includes(e.id),
    ))
      expect(serialized).not.toContain(e.content)
    for (const c of wutongClinicCase.characters)
      for (const fact of c.privateFacts) expect(serialized).not.toContain(fact)
    expect(serialized).not.toContain('truthTimeline')
    expect(serialized).not.toContain('roleType')
    expect(serialized).not.toContain('verdict')
  })
  it('keeps AI summaries out of character public history', () => {
    const payload = buildAI1Payload({
      caseDefinition: demoCase,
      characterId: 'lin',
      playerQuestion: '你好',
      conversationHistory: [
        {
          id: 'secret',
          speakerId: 'ai2',
          content: 'private inference',
          turnType: 'ai2_summary',
          timestamp: '',
        },
      ],
    })
    expect(payload.conversationHistory).toEqual([])
  })
  it('rejects a summary citing absent evidence', () => {
    expect(() =>
      parseAI2StructuredSummary(
        JSON.stringify({
          timeline: ['事实'],
          contradictions: [],
          suspicions: [],
          clueGaps: [],
          sources: { 'timeline:0': ['hidden'] },
        }),
        ['visible'],
      ),
    ).toThrow('来源')
  })
  it('discards old responses after changing case', async () => {
    let complete!: (r: AIResponse) => void
    const transport: AITransport = {
      request: () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    }
    useGameStore.setState({ draft: '旧问题' })
    const pending = runInvestigation('question', false, transport)
    useGameStore.getState().openCase(wutongClinicCase.id)
    complete({ content: '过时回答', model: 'test' })
    await pending
    expect(useGameStore.getState().turns).toEqual([])
    expect(useRequestStore.getState().busy).toBe(false)
  })
  it('retries only failed group participants without duplicate questions or answers', async () => {
    const calls: string[] = []
    let fail = true
    const transport: AITransport = {
      request: async (r: AIRequest) => {
        calls.push(r.characterId || r.mode)
        if (r.characterId === 'qiao' && fail) throw new Error('offline')
        return {
          content:
            r.mode === 'evidence_check'
              ? '{"triggeredEvidenceIds":[]}'
              : '回答',
          model: 'test',
        }
      },
    }
    useGameStore.setState({ draft: '你们看到了什么？', questionMode: 'all' })
    await runInvestigation('question', false, transport)
    expect(useGameStore.getState().round?.completedIds).toEqual([
      'lin',
      'chen',
      'wu',
    ])
    fail = false
    await runInvestigation('question', true, transport)
    expect(calls.filter((id) => id === 'lin')).toHaveLength(1)
    expect(calls.filter((id) => id === 'qiao')).toHaveLength(2)
    expect(
      useGameStore
        .getState()
        .turns.filter((t) => t.turnType === 'player_question'),
    ).toHaveLength(1)
    expect(
      useGameStore
        .getState()
        .turns.filter((t) => t.turnType === 'character_answer'),
    ).toHaveLength(4)
  })
  it('cancel preserves the question and ignores late completion', async () => {
    let complete!: (r: AIResponse) => void
    useGameStore.setState({ draft: '保持问题' })
    const pending = runInvestigation('question', false, {
      request: () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    })
    cancelInvestigation()
    complete({ content: '晚到', model: 'test' })
    await pending
    expect(useGameStore.getState().round?.question).toBe('保持问题')
    expect(
      useGameStore.getState().turns.some((t) => t.content === '晚到'),
    ).toBe(false)
  })
})

it('does not display a model-invented method even when it cites a valid source', () => {
  const summary = parseAI2StructuredSummary(
    JSON.stringify({
      timeline: [],
      contradictions: [],
      suspicions: ['用口香糖粘住戒指藏在柜台下'],
      clueGaps: [],
      sources: { 'suspicions:0': ['wrapper'] },
    }),
    ['wrapper'],
  )
  const grounded = groundStructuredSummary(summary, {
    caseId: 'clinic',
    incidentSummary: '',
    sources: [
      {
        id: 'wrapper',
        kind: 'evidence',
        speaker: '民警',
        content: '垃圾桶里找到包装纸。',
      },
    ],
  })
  expect(grounded.suspicions[0]).toContain('垃圾桶里找到包装纸')
  expect(JSON.stringify(grounded)).not.toContain('粘住戒指')
  expect(JSON.stringify(grounded)).not.toContain('柜台下')
})
it('retries a cancelled summary as a summary', async () => {
  let complete!: (value: AIResponse) => void
  const pending = runInvestigation('summary', false, {
    request: () =>
      new Promise((resolve) => {
        complete = resolve
      }),
  })
  cancelInvestigation()
  expect(useRequestStore.getState().retry).toBe('summary')
  complete({ content: '{}', model: 'test' })
  await pending
})
