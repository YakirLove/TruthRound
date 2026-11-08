export type RoleType =
  | 'culprit'
  | 'accomplice'
  | 'witness'
  | 'innocent'
  | 'police'

export type SummaryType =
  | 'timeline'
  | 'contradictions'
  | 'clue_gaps'
  | 'unresolved_questions'

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
  portrait: string
  avatar: string
  emotion: string
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
  requiresEvidenceIds?: string[]
}

export interface CaseReporter {
  name: string
  portrait: string
  identity: string
  concern: string
  statement: string
}

export interface InvolvedPartyBrief {
  characterId: string
  relationship: string
  summonsReason: string
}

export interface CaseDefinition {
  schemaVersion: 1
  version: string
  difficulty: number
  summary: string
  tags: string[]
  id: string
  title: string
  incidentSummary: string
  reportText: string
  reporter: CaseReporter
  involvedParties: InvolvedPartyBrief[]
  sceneAssets: {
    storefront: string
    roundtable: string
    evidenceBoard: string
    verdictDesk: string
    verdictResult: string
  }
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

export type CaseListStatus = 'unlocked' | 'locked'

export interface CaseListItem {
  id: string
  title: string
  difficulty: number
  status: CaseListStatus
  summary: string
  tags: string[]
  caseDefinition?: CaseDefinition
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
  sources?: Record<string, string[]>
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
  sessionId?: string
  requestId?: string
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

export type CasePackage = CaseDefinition
export type GamePhase =
  | 'home'
  | 'case_select'
  | 'report'
  | 'roundtable'
  | 'verdict'
  | 'result'
export interface KnowledgeSource {
  id: string
  kind: 'statement' | 'evidence' | 'question'
  speaker: string
  content: string
}
export interface PlayerKnowledge {
  caseId: string
  incidentSummary: string
  sources: KnowledgeSource[]
}
export interface QuestionRound {
  id: string
  question: string
  targetIds: string[]
  completedIds: string[]
  failedIds: string[]
  quote?: ConversationTurn
  evidenceChecked: boolean
}
export interface InvestigationSession {
  sessionId: string
  phase: GamePhase
  currentCaseId: string
  activeCharacterId: string
  questionMode: 'single' | 'all'
  draft: string
  turns: ConversationTurn[]
  selectedQuote?: ConversationTurn
  revealedEvidenceIds: string[]
  discoveredEvidenceIds: string[]
  latestSummary: string
  latestStructuredSummary?: AI2StructuredSummary
  verdictRoles: Record<
    string,
    'culprit' | 'accomplice' | 'innocent' | 'unassigned'
  >
  verdict?: PlayerVerdict
  result?: VerdictScore
  round?: QuestionRound
  reportStep: number
}
export interface GameSettings {
  fontSize: number
  textSpeed: number
  volume: number
  muted: boolean
  reduceMotion: boolean
}

export interface PlayerVerdict {
  culpritIds: string[]
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
