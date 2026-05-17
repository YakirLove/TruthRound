import { describe, expect, it } from 'vitest'
import { demoCase } from './cases'
import {
  buildAI1Payload,
  buildAI2Payload,
  buildEvidenceCheckPayload,
  createMockAIResponse,
  getInitialEvidence,
  getLockedEvidence,
  makeTurn,
  parseAI2StructuredSummary,
  parseTriggeredEvidenceIds,
  redactSpoilers,
  scoreVerdict,
} from './logic'

describe('AI permission boundaries', () => {
  it('builds AI1 payload with only the active character perspective', () => {
    const payload = buildAI1Payload({
      caseDefinition: demoCase,
      characterId: 'chen',
      playerQuestion: '你当时到底在哪里？',
      conversationHistory: [],
    })

    expect(payload.character.name).toBe('陈阿姨')
    expect(payload.visibleFacts.join('\n')).toContain('19:05左右在店门口看见林越拿着一个蓝色快递盒')
    expect(JSON.stringify(payload)).not.toContain('把快递藏到了修车铺旧轮胎后面')
    expect(JSON.stringify(payload)).not.toContain('lin')
    expect(JSON.stringify(payload)).not.toContain('verdict')
    expect(JSON.stringify(payload)).not.toContain('truthTimeline')
  })

  it('builds AI2 payload with full truth but redacts direct-answer output', () => {
    const payload = buildAI2Payload({
      caseDefinition: demoCase,
      conversationHistory: [],
      revealedEvidenceIds: ['parcel-record'],
    })

    expect(JSON.stringify(payload)).toContain('把快递藏到了修车铺旧轮胎后面')
    expect(JSON.stringify(payload)).toContain('revealedEvidence')
    expect(JSON.stringify(payload)).toContain('availableEvidence')
    expect(JSON.stringify(payload)).toContain('timeline')
    expect(JSON.stringify(payload)).toContain('contradictions')
    expect(JSON.stringify(payload)).toContain('suspicions')
    expect(JSON.stringify(payload)).toContain('clueGaps')
    expect(redactSpoilers('主谋是林越，他在撒谎，正确答案就是他。')).toBe(
      '有一名关键人物的说法需要重点复核，他的表述存在直接指向答案的风险，已隐藏。请回到时间线和证据缺口继续追问。',
    )
  })

  it('builds AI1 payload with quoted context without leaking full truth', () => {
    const quotedTurn = makeTurn('chen', '我看见林越抱着个蓝盒子往巷尾走。', 'opening')
    const payload = buildAI1Payload({
      caseDefinition: demoCase,
      characterId: 'lin',
      playerQuestion: '你怎么解释这句话？',
      quotedTurn,
      conversationHistory: [quotedTurn],
    })

    expect(payload.quotedContext?.content).toContain('蓝盒子')
    expect(JSON.stringify(payload)).not.toContain('她猜到林越藏了东西')
    expect(JSON.stringify(payload)).not.toContain('verdict')
  })

  it('builds AI2 evidence check payload without exposing evidence content', () => {
    const playerTurn = makeTurn('player', '19:05之后巷尾那边有没有客观记录？', 'player_question', 'lin')
    const answerTurn = makeTurn('lin', '我没去巷尾，我就是路过。', 'character_answer')
    const payload = buildEvidenceCheckPayload({
      caseDefinition: demoCase,
      conversationHistory: [playerTurn, answerTurn],
      revealedEvidenceIds: getInitialEvidence(demoCase).map((evidence) => evidence.id),
      discoveredEvidenceIds: [],
    })

    expect(payload.mode).toBe('evidence_check')
    expect(JSON.stringify(payload)).toContain('证据一')
    expect(JSON.stringify(payload)).toContain('巷尾方向的客观记录')
    expect(JSON.stringify(payload)).not.toContain('19:07的玻璃倒影')
    expect(payload.evidenceSlots.every((slot) => !('content' in slot))).toBe(true)
  })
})

describe('game helpers', () => {
  it('includes a fuller opening briefing with reporter and involved parties', () => {
    expect(demoCase.reporter.name).toBe('刘婶')
    expect(demoCase.reporter.statement).toContain('代收架')
    expect(demoCase.involvedParties.map((party) => party.characterId)).toEqual(['lin', 'qiao', 'chen', 'wu'])
    expect(demoCase.involvedParties.every((party) => party.relationship && party.summonsReason)).toBe(true)
  })

  it('includes visual novel scene and character assets for the first case', () => {
    expect(demoCase.sceneAssets.storefront).toContain('storefront')
    expect(demoCase.sceneAssets.roundtable).toContain('roundtable')
    expect(demoCase.sceneAssets.evidenceBoard).toContain('evidence')
    expect(demoCase.reporter.portrait).toContain('liu')
    expect(demoCase.characters.every((character) => character.portrait && character.avatar)).toBe(true)
  })

  it('scores the final verdict by culprit, accomplice, and innocents', () => {
    const result = scoreVerdict(demoCase, {
      culpritId: 'lin',
      accompliceIds: ['qiao'],
      innocentIds: ['chen', 'wu'],
    })

    expect(result.score).toBe(100)
    expect(result.correctCulprit).toBe(true)
    expect(result.correctAccomplices).toBe(true)
    expect(result.correctInnocents).toBe(true)
  })

  it('provides deterministic mock responses for offline play', () => {
    const answer = createMockAIResponse({
      mode: 'roleplay',
      caseId: demoCase.id,
      characterId: 'lin',
      playerQuestion: '你拿过快递吗？',
      conversationHistory: [],
    })

    expect(answer.model).toBe('mock-roleplay')
    expect(answer.content).toContain('林越')
  })

  it('creates turns with stable ids and optional quote metadata', () => {
    const quoted = makeTurn('chen', '我看见一个蓝盒子。', 'opening')
    const turn = makeTurn('player', '请解释这句话。', 'player_question', 'lin', quoted)

    expect(turn.id).toMatch(/^turn-/)
    expect(turn.quotedTurnId).toBe(quoted.id)
    expect(turn.quotedExcerpt).toMatchObject({
      speakerId: 'chen',
      content: '我看见一个蓝盒子。',
    })
  })

  it('parses AI2 structured JSON and fails clearly on invalid text', () => {
    const summary = parseAI2StructuredSummary(
      '{"timeline":["19:05 陈阿姨目击蓝盒子"],"contradictions":["林越与陈阿姨说法冲突"],"suspicions":["继续追问林越是否接触盒子"],"clueGaps":["缺少巷尾去向确认"]}',
    )

    expect(summary.timeline).toHaveLength(1)
    expect(summary.contradictions[0]).toContain('冲突')
    expect(() => parseAI2StructuredSummary('只有普通文字')).toThrow('AI2 summary is not valid JSON')
  })

  it('parses evidence check ids and filters unknown evidence ids', () => {
    expect(parseTriggeredEvidenceIds('{"triggeredEvidenceIds":["barbershop-reflection","unknown"]}', ['barbershop-reflection'])).toEqual([
      'barbershop-reflection',
    ])
    expect(() => parseTriggeredEvidenceIds('普通文字', ['barbershop-reflection'])).toThrow(
      'Evidence check is not valid JSON',
    )
  })

  it('separates initial police evidence from locked evidence', () => {
    const initialEvidence = getInitialEvidence(demoCase)
    const lockedEvidence = getLockedEvidence(demoCase, initialEvidence.map((evidence) => evidence.id))

    expect(initialEvidence.length).toBeGreaterThan(0)
    expect(initialEvidence.every((evidence) => evidence.stage === 'initial')).toBe(true)
    expect(lockedEvidence.length).toBeGreaterThan(0)
    expect(lockedEvidence.every((evidence) => evidence.stage === 'unlockable')).toBe(true)
  })
})
