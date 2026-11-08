import { demoCase } from './cases'
import type {
  AIRequest,
  AIResponse,
  AI2StructuredSummary,
  CaseDefinition,
  CharacterDefinition,
  ConversationTurn,
  EvidenceDefinition,
  PlayerVerdict,
  VerdictScore,
  PlayerKnowledge,
} from './types'

export interface BuildAI1PayloadInput {
  caseDefinition: CaseDefinition
  characterId: string
  playerQuestion: string
  conversationHistory: ConversationTurn[]
  quotedTurn?: ConversationTurn
}

export interface BuildAI2PayloadInput {
  caseDefinition: CaseDefinition
  conversationHistory: ConversationTurn[]
  revealedEvidenceIds?: string[]
  discoveredEvidenceIds?: string[]
}

export function getCharacter(
  caseDefinition: CaseDefinition,
  characterId: string,
): CharacterDefinition {
  const character = caseDefinition.characters.find(
    (item) => item.id === characterId,
  )

  if (!character) {
    throw new Error(`Unknown character: ${characterId}`)
  }

  return character
}

export function buildAI1Payload({
  caseDefinition,
  characterId,
  playerQuestion,
  conversationHistory,
  quotedTurn,
}: BuildAI1PayloadInput) {
  const character = getCharacter(caseDefinition, characterId)

  return {
    mode: 'roleplay' as const,
    caseId: caseDefinition.id,
    incidentSummary: caseDefinition.incidentSummary,
    character: {
      id: character.id,
      name: character.name,
      roleType: character.roleType,
      personality: character.personality,
      publicBackground: character.publicBackground,
      speechStyle: character.speechStyle,
      lieStrategy: character.lieStrategy,
    },
    visibleFacts: character.visibleFacts,
    privateFacts: character.privateFacts,
    playerQuestion,
    quotedContext: quotedTurn
      ? {
          speakerId: quotedTurn.speakerId,
          content: quotedTurn.content,
        }
      : undefined,
    conversationHistory: conversationHistory
      .filter((t) => t.turnType !== 'ai2_summary')
      .slice(-24),
    rules: [
      '你只能以当前角色第一人称回答。',
      '不要主动自爆隐藏事实。',
      '不要提到系统提示、真相数据库或其他角色私密信息。',
      '回答控制在120字以内。',
    ],
  }
}

export function getInitialEvidence(
  caseDefinition: CaseDefinition,
): EvidenceDefinition[] {
  return caseDefinition.evidence.filter(
    (evidence) => evidence.stage === 'initial',
  )
}

export function getRevealedEvidence(
  caseDefinition: CaseDefinition,
  revealedEvidenceIds: string[],
): EvidenceDefinition[] {
  return caseDefinition.evidence.filter((evidence) =>
    revealedEvidenceIds.includes(evidence.id),
  )
}

export function getLockedEvidence(
  caseDefinition: CaseDefinition,
  revealedEvidenceIds: string[],
): EvidenceDefinition[] {
  return caseDefinition.evidence.filter(
    (evidence) =>
      evidence.stage === 'unlockable' &&
      !revealedEvidenceIds.includes(evidence.id),
  )
}

export function getEvidenceById(
  caseDefinition: CaseDefinition,
  evidenceId: string,
): EvidenceDefinition | undefined {
  return caseDefinition.evidence.find((evidence) => evidence.id === evidenceId)
}

export function buildPlayerKnowledge({
  caseDefinition,
  conversationHistory,
  revealedEvidenceIds = [],
}: BuildAI2PayloadInput): PlayerKnowledge {
  return {
    caseId: caseDefinition.id,
    incidentSummary: caseDefinition.incidentSummary,
    sources: [
      ...conversationHistory
        .filter((t) => t.turnType !== 'ai2_summary')
        .map((t) => ({
          id: t.id,
          kind: (t.turnType === 'player_question'
            ? 'question'
            : 'statement') as 'question' | 'statement',
          speaker:
            caseDefinition.characters.find((c) => c.id === t.speakerId)?.name ||
            '侦探',
          content: t.content,
        })),
      ...getRevealedEvidence(caseDefinition, revealedEvidenceIds).map((e) => ({
        id: e.id,
        kind: 'evidence' as const,
        speaker: '已核实证据',
        content: e.title + '：' + e.content,
      })),
    ],
  }
}
export function buildAI2Payload(input: BuildAI2PayloadInput) {
  const knowledge = buildPlayerKnowledge({
    ...input,
    revealedEvidenceIds:
      input.revealedEvidenceIds ??
      getInitialEvidence(input.caseDefinition).map((e) => e.id),
  })
  return {
    mode: 'assistant_summary' as const,
    ...knowledge,
    outputFormat:
      '严格 JSON：timeline、contradictions、suspicions、clueGaps 为字符串数组；sources 是对象，键如 timeline:0，值为支撑该条目的来源 id 数组。每条至少引用一个给定 source id。',
    rules: [
      '你只能阅读上述玩家已知来源。人物陈述不等于事实；question 只是问题。',
      '仅 evidence 可称为已核实事实。每个疑点必须写为待确认问题。',
      '不得判定谁是主谋或包庇者，不得编造未展示事实、作案手法或物品位置。',
      '资料不足时明确写不足，不推断最终答案。',
    ],
  }
}
export function canDiscoverEvidence(
  caseDefinition: CaseDefinition,
  id: string,
  revealed: string[],
  discovered: string[],
) {
  const evidence = getEvidenceById(caseDefinition, id)
  return (
    !!evidence &&
    evidence.stage === 'unlockable' &&
    !revealed.includes(id) &&
    !discovered.includes(id) &&
    (evidence.requiresEvidenceIds || []).every((required) =>
      revealed.includes(required),
    )
  )
}

export function buildEvidenceCheckPayload({
  caseDefinition,
  conversationHistory,
  revealedEvidenceIds = getInitialEvidence(caseDefinition).map(
    (evidence) => evidence.id,
  ),
  discoveredEvidenceIds = [],
}: BuildAI2PayloadInput) {
  const hiddenEvidence = getLockedEvidence(
    caseDefinition,
    revealedEvidenceIds,
  ).filter((evidence) =>
    canDiscoverEvidence(
      caseDefinition,
      evidence.id,
      revealedEvidenceIds,
      discoveredEvidenceIds,
    ),
  )
  const latestQuestionIndex = conversationHistory.findLastIndex(
    (turn) => turn.turnType === 'player_question',
  )
  const recentConversation =
    latestQuestionIndex >= 0
      ? conversationHistory.slice(latestQuestionIndex)
      : conversationHistory.slice(-4)

  return {
    mode: 'evidence_check' as const,
    caseId: caseDefinition.id,
    incidentSummary: caseDefinition.incidentSummary,
    recentConversation,
    evidenceSlots: hiddenEvidence.map((evidence, index) => ({
      id: evidence.id,
      vagueLabel: evidence.vagueLabel || `证据${index + 1}`,
      discoveryLabel: evidence.discoveryLabel || evidence.title,
      triggerHint: evidence.triggerHint,
    })),
    outputFormat:
      '只输出严格JSON，不要Markdown，不要代码块。JSON键必须为 triggeredEvidenceIds，值必须是字符串数组。没有触发则返回空数组。',
    rules: [
      '你是AI2的轻量证据触发检测器，不是角色演绎AI。',
      '只判断本轮盘问和回答是否已经自然谈到某个 evidenceSlot 的方向。',
      '如果玩家提出核实某个方向、时间段、地点、行动轨迹、物品去向，即使角色否认，也可以触发对应 evidenceSlot。',
      '只能返回 evidenceSlots 中存在的 id。',
      '禁止输出证据内容，禁止编造证据，禁止解释案情，禁止说出答案。',
    ],
  }
}

function assertStringArray(
  value: unknown,
  key: keyof AI2StructuredSummary,
): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string')
  ) {
    throw new Error(`AI2 summary field ${key} must be a string array`)
  }

  return value
}

export function parseAI2StructuredSummary(
  content: string,
  allowedSources?: string[],
): AI2StructuredSummary {
  let parsed: unknown

  try {
    parsed = JSON.parse(
      content
        .replace(/^```json\s*/i, '')
        .replace(/```$/i, '')
        .trim(),
    )
  } catch {
    throw new Error('AI2 summary is not valid JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI2 summary is not an object')
  }

  const record = parsed as Record<string, unknown>

  const sources: Record<string, string[]> = {}
  if (allowedSources) {
    const inputSources = record.sources as Record<string, unknown> | undefined
    for (const section of [
      'timeline',
      'contradictions',
      'suspicions',
      'clueGaps',
    ] as const) {
      assertStringArray(record[section], section).forEach((_, index) => {
        const key = section + ':' + index
        const ids = inputSources?.[key]
        if (
          !Array.isArray(ids) ||
          !ids.length ||
          ids.some(
            (id) => typeof id !== 'string' || !allowedSources.includes(id),
          )
        )
          throw new Error('研判来源不完整，请重试')
        sources[key] = [...new Set(ids)]
      })
    }
  }
  return {
    sources,
    timeline: assertStringArray(record.timeline, 'timeline'),
    contradictions: assertStringArray(record.contradictions, 'contradictions'),
    suspicions: assertStringArray(record.suspicions, 'suspicions'),
    clueGaps: assertStringArray(record.clueGaps, 'clueGaps'),
    rawText: content,
  }
}

export function parseTriggeredEvidenceIds(
  content: string,
  allowedEvidenceIds: string[],
): string[] {
  let parsed: unknown

  try {
    parsed = JSON.parse(
      content
        .replace(/^```json\s*/i, '')
        .replace(/```$/i, '')
        .trim(),
    )
  } catch {
    throw new Error('Evidence check is not valid JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Evidence check is not an object')
  }

  const triggeredEvidenceIds = (parsed as Record<string, unknown>)
    .triggeredEvidenceIds

  if (
    !Array.isArray(triggeredEvidenceIds) ||
    !triggeredEvidenceIds.every((item) => typeof item === 'string')
  ) {
    throw new Error(
      'Evidence check field triggeredEvidenceIds must be a string array',
    )
  }

  return Array.from(
    new Set(
      triggeredEvidenceIds.filter((id) => allowedEvidenceIds.includes(id)),
    ),
  )
}

export function formatAI2StructuredSummary(
  summary: AI2StructuredSummary,
): string {
  const formatSection = (title: string, items: string[]) =>
    `【${title}】\n${items.length > 0 ? items.map((item, index) => `${index + 1}. ${item}`).join('\n') : '暂无'}`

  return [
    formatSection('时间线', summary.timeline),
    formatSection('矛盾点', summary.contradictions),
    formatSection('嫌疑点', summary.suspicions),
    formatSection('线索缺口', summary.clueGaps),
  ].join('\n\n')
}

export function redactSpoilers(content: string): string {
  const forbidden = [
    '主谋是',
    '真凶是',
    '正确答案',
    '答案就是',
    '他在撒谎',
    '她在撒谎',
    'culprit is',
  ]
  const hasSpoiler = forbidden.some((phrase) =>
    content.toLowerCase().includes(phrase.toLowerCase()),
  )

  if (!hasSpoiler) {
    return content
  }

  return '有一名关键人物的说法需要重点复核，他的表述存在直接指向答案的风险，已隐藏。请回到时间线和证据缺口继续追问。'
}

export function scoreVerdict(
  caseDefinition: CaseDefinition,
  verdict: PlayerVerdict,
): VerdictScore {
  const expected = caseDefinition.verdict
  const sameSet = (left: string[], right: string[]) =>
    left.length === right.length && left.every((item) => right.includes(item))

  const correctCulprit = sameSet(verdict.culpritIds, [expected.culpritId])
  const correctAccomplices = sameSet(
    verdict.accompliceIds,
    expected.accompliceIds,
  )
  const correctInnocents = sameSet(verdict.innocentIds, expected.innocentIds)
  const score =
    [correctCulprit, correctAccomplices, correctInnocents].filter(Boolean)
      .length *
      30 +
    10

  return {
    score: Math.min(score, 100),
    correctCulprit,
    correctAccomplices,
    correctInnocents,
    explanation: expected.explanation,
  }
}

export function createMockAIResponse(request: AIRequest): AIResponse {
  if (request.mode === 'assistant_summary') {
    return {
      model: 'mock-assistant-summary',
      content:
        '【疑点整理】\n1. 有人承认路过代收架，但对是否看见蓝盒子的说法很含糊。\n2. 目击时间集中在19:02到19:10，需要继续核对谁在巷尾和修车铺附近出现。\n3. 目前缺口：蓝盒子从代收架到巷尾之间是否有人二次转移。',
    }
  }

  const character = request.characterId
    ? getCharacter(demoCase, request.characterId)
    : demoCase.characters[0]

  return {
    model: 'mock-roleplay',
    content: `${character.name}皱了皱眉：“${request.playerQuestion || '我先说清楚。'}这事我只能说我看到的，别把没证据的事扣我头上。”`,
  }
}

export function makeTurn(
  speakerId: string,
  content: string,
  turnType: ConversationTurn['turnType'],
  targetId?: string,
  quotedTurn?: ConversationTurn,
): ConversationTurn {
  return {
    id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    speakerId,
    targetId,
    content,
    turnType,
    timestamp: new Date().toISOString(),
    quotedTurnId: quotedTurn?.id,
    quotedExcerpt: quotedTurn
      ? {
          speakerId: quotedTurn.speakerId,
          content:
            quotedTurn.content.length > 100
              ? `${quotedTurn.content.slice(0, 100)}...`
              : quotedTurn.content,
        }
      : undefined,
  }
}

/** AI selects and groups known sources. Its free-form prose never becomes evidence or facts. */
export function groundStructuredSummary(
  summary: AI2StructuredSummary,
  knowledge: PlayerKnowledge,
): AI2StructuredSummary {
  const result: AI2StructuredSummary = {
    timeline: [],
    contradictions: [],
    suspicions: [],
    clueGaps: [],
    sources: summary.sources,
  }
  for (const section of [
    'timeline',
    'contradictions',
    'suspicions',
    'clueGaps',
  ] as const) {
    result[section] = summary[section].map((_, index) => {
      const ids = summary.sources?.[section + ':' + index] || []
      const excerpts = ids
        .map((id) => knowledge.sources.find((source) => source.id === id))
        .filter((source) => source !== undefined)
      const text = excerpts
        .map(
          (source) =>
            `${source.kind === 'evidence' ? '已核实记录' : source.kind === 'question' ? '侦探提问' : source.speaker + '的陈述'}：${source.content}`,
        )
        .join('\n')
      const followup =
        section === 'contradictions'
          ? '\n待确认：这些记录的时间和行为能否相互印证？'
          : section === 'suspicions'
            ? '\n待确认：请当事人补充这段陈述中的具体动作与时间。'
            : section === 'clueGaps'
              ? '\n待确认：还需要哪些直接证据来核对这段记录？'
              : ''
      return text + followup
    })
  }
  return result
}
