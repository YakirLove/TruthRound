export type RoleType = 'culprit' | 'accomplice' | 'witness' | 'innocent' | 'police'

export type SummaryType = 'timeline' | 'contradictions' | 'clue_gaps' | 'unresolved_questions'

export type TurnType =
  | 'opening'
  | 'player_question'
  | 'character_answer'
  | 'police_control'
  | 'ai2_summary'

export interface CharacterDefinition {
  id: string
  name: string
  roleType: RoleType
  personality: string
  publicBackground: string
  privateFacts: string[]
  visibleFacts: string[]
  lieStrategy: string
  speechStyle: string
  openingStatement: string
}

export type EvidenceStage = 'initial' | 'unlockable'
export type EvidenceProvider = 'police' | 'ai2_or_police'
export type EvidenceDiscoveryState = 'hidden' | 'discovered' | 'revealed'

export interface EvidenceDefinition {
  id: string
  title: string
  stage: EvidenceStage
  provider: EvidenceProvider
  content: string
  vagueLabel?: string
  discoveryLabel?: string
  triggerHint?: string
}

export interface CaseDefinition {
  id: string
  title: string
  incidentSummary: string
  reportText: string
  truthTimeline: string[]
  evidence: EvidenceDefinition[]
  characters: CharacterDefinition[]
  verdict: {
    culpritId: string
    accompliceIds: string[]
    innocentIds: string[]
    explanation: string
  }
}

export interface ConversationTurn {
  id: string
  speakerId: string
  targetId?: string
  content: string
  turnType: TurnType
  timestamp: string
  quotedTurnId?: string
  quotedExcerpt?: {
    speakerId: string
    content: string
  }
}

export interface AI2StructuredSummary {
  timeline: string[]
  contradictions: string[]
  suspicions: string[]
  clueGaps: string[]
  rawText?: string
}

export interface AIRequest {
  mode: 'roleplay' | 'assistant_summary' | 'evidence_check'
  caseId: string
  characterId?: string
  playerQuestion?: string
  conversationHistory: ConversationTurn[]
  summaryType?: SummaryType
  quotedTurn?: ConversationTurn
  revealedEvidenceIds?: string[]
  discoveredEvidenceIds?: string[]
}

export interface AIResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: string
}

export interface PlayerVerdict {
  culpritId: string
  accompliceIds: string[]
  innocentIds: string[]
}

export interface VerdictScore {
  score: number
  correctCulprit: boolean
  correctAccomplices: boolean
  correctInnocents: boolean
  explanation: string
}
