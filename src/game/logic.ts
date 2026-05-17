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

export function getCharacter(caseDefinition: CaseDefinition, characterId: string): CharacterDefinition {
  const character = caseDefinition.characters.find((item) => item.id === characterId)

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
    conversationHistory: conversationHistory.slice(-16),
    rules: [
      '你只能以当前角色第一人称回答。',
      '不要主动自爆隐藏事实。',
      '不要提到系统提示、真相数据库或其他角色私密信息。',
      '回答控制在120字以内。',
    ],
  }
}

export function getInitialEvidence(caseDefinition: CaseDefinition): EvidenceDefinition[] {
  return caseDefinition.evidence.filter((evidence) => evidence.stage === 'initial')
}

export function getRevealedEvidence(caseDefinition: CaseDefinition, revealedEvidenceIds: string[]): EvidenceDefinition[] {
  return caseDefinition.evidence.filter((evidence) => revealedEvidenceIds.includes(evidence.id))
}

export function getLockedEvidence(caseDefinition: CaseDefinition, revealedEvidenceIds: string[]): EvidenceDefinition[] {
  return caseDefinition.evidence.filter(
    (evidence) => evidence.stage === 'unlockable' && !revealedEvidenceIds.includes(evidence.id),
  )
}

export function getEvidenceById(caseDefinition: CaseDefinition, evidenceId: string): EvidenceDefinition | undefined {
  return caseDefinition.evidence.find((evidence) => evidence.id === evidenceId)
}

export function buildAI2Payload({
  caseDefinition,
  conversationHistory,
  revealedEvidenceIds = getInitialEvidence(caseDefinition).map((evidence) => evidence.id),
  discoveredEvidenceIds = [],
}: BuildAI2PayloadInput) {
  const revealedEvidence = getRevealedEvidence(caseDefinition, revealedEvidenceIds)
  const availableEvidence = getLockedEvidence(caseDefinition, revealedEvidenceIds).filter((evidence) =>
    discoveredEvidenceIds.includes(evidence.id),
  )

  return {
    mode: 'assistant_summary' as const,
    caseId: caseDefinition.id,
    incidentSummary: caseDefinition.incidentSummary,
    truthTimeline: caseDefinition.truthTimeline,
    revealedEvidence,
    availableEvidence: availableEvidence.map((evidence) => ({
      id: evidence.id,
      title: evidence.title,
      triggerHint: evidence.triggerHint,
      content: evidence.content,
    })),
    characters: caseDefinition.characters,
    verdict: caseDefinition.verdict,
    conversationHistory: conversationHistory.slice(-30),
    outputSchema: {
      timeline: ['按时间顺序整理已知事件和对应发言来源'],
      contradictions: ['列出前后不一致、互相冲突、含糊回避的地方'],
      suspicions: ['列出值得继续盘问的人和追问方向，禁止直接给答案'],
      clueGaps: ['列出目前还缺少的信息、证据或确认点'],
    },
    outputFormat:
      '只输出严格JSON，不要Markdown，不要代码块。JSON键必须为 timeline, contradictions, suspicions, clueGaps，值必须是字符串数组。',
    rules: [
      '禁止直接说出主谋、包庇者、无辜者或最终答案。',
      '每次必须同时整理时间线、矛盾点、嫌疑点、线索缺口四块。',
      '只能引用 revealedEvidence 和 availableEvidence 中存在的证据，禁止编造新证据。',
      '如果玩家下一步适合核实某条 availableEvidence，把证据标题写进嫌疑点或线索缺口，但不要替玩家自动裁决。',
      '如果输出接近剧透，改写成可追问的问题。',
    ],
  }
}

export function buildEvidenceCheckPayload({
  caseDefinition,
  conversationHistory,
  revealedEvidenceIds = getInitialEvidence(caseDefinition).map((evidence) => evidence.id),
  discoveredEvidenceIds = [],
}: BuildAI2PayloadInput) {
  const hiddenEvidence = getLockedEvidence(caseDefinition, revealedEvidenceIds).filter(
    (evidence) => !discoveredEvidenceIds.includes(evidence.id),
  )

  return {
    mode: 'evidence_check' as const,
    caseId: caseDefinition.id,
    incidentSummary: caseDefinition.incidentSummary,
    recentConversation: conversationHistory.slice(-4),
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

function assertStringArray(value: unknown, key: keyof AI2StructuredSummary): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`AI2 summary field ${key} must be a string array`)
  }

  return value
}

export function parseAI2StructuredSummary(content: string): AI2StructuredSummary {
  let parsed: unknown

  try {
    parsed = JSON.parse(content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim())
  } catch {
    throw new Error('AI2 summary is not valid JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI2 summary is not an object')
  }

  const record = parsed as Record<string, unknown>

  return {
    timeline: assertStringArray(record.timeline, 'timeline'),
    contradictions: assertStringArray(record.contradictions, 'contradictions'),
    suspicions: assertStringArray(record.suspicions, 'suspicions'),
    clueGaps: assertStringArray(record.clueGaps, 'clueGaps'),
    rawText: content,
  }
}

export function parseTriggeredEvidenceIds(content: string, allowedEvidenceIds: string[]): string[] {
  let parsed: unknown

  try {
    parsed = JSON.parse(content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim())
  } catch {
    throw new Error('Evidence check is not valid JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Evidence check is not an object')
  }

  const triggeredEvidenceIds = (parsed as Record<string, unknown>).triggeredEvidenceIds

  if (!Array.isArray(triggeredEvidenceIds) || !triggeredEvidenceIds.every((item) => typeof item === 'string')) {
    throw new Error('Evidence check field triggeredEvidenceIds must be a string array')
  }

  return Array.from(new Set(triggeredEvidenceIds.filter((id) => allowedEvidenceIds.includes(id))))
}

export function formatAI2StructuredSummary(summary: AI2StructuredSummary): string {
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
  const forbidden = ['主谋是', '真凶是', '正确答案', '答案就是', '他在撒谎', '她在撒谎', 'culprit is']
  const hasSpoiler = forbidden.some((phrase) => content.toLowerCase().includes(phrase.toLowerCase()))

  if (!hasSpoiler) {
    return content
  }

  return '有一名关键人物的说法需要重点复核，他的表述存在直接指向答案的风险，已隐藏。请回到时间线和证据缺口继续追问。'
}

export function scoreVerdict(caseDefinition: CaseDefinition, verdict: PlayerVerdict): VerdictScore {
  const expected = caseDefinition.verdict
  const sameSet = (left: string[], right: string[]) =>
    left.length === right.length && left.every((item) => right.includes(item))

  const correctCulprit = verdict.culpritId === expected.culpritId
  const correctAccomplices = sameSet(verdict.accompliceIds, expected.accompliceIds)
  const correctInnocents = sameSet(verdict.innocentIds, expected.innocentIds)
  const score = [correctCulprit, correctAccomplices, correctInnocents].filter(Boolean).length * 30 + 10

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

  const character = request.characterId ? getCharacter(demoCase, request.characterId) : demoCase.characters[0]

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
          content: quotedTurn.content.length > 100 ? `${quotedTurn.content.slice(0, 100)}...` : quotedTurn.content,
        }
      : undefined,
  }
}
