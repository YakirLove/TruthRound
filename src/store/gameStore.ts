import { create } from 'zustand'
import { caseList, demoCase, getCaseDefinition, getPlayableCharacters, getPoliceCharacter } from '../game/cases'
import { getEvidenceById, getInitialEvidence, makeTurn, scoreVerdict } from '../game/logic'
import type { AI2StructuredSummary, ConversationTurn, PlayerVerdict, SummaryType, VerdictScore } from '../game/types'

type GamePhase = 'home' | 'case_select' | 'report' | 'roundtable' | 'verdict' | 'result'

interface GameState {
  phase: GamePhase
  currentCaseId: string
  activeCharacterId: string
  useMockAI: boolean
  turns: ConversationTurn[]
  latestSummary: string
  latestStructuredSummary?: AI2StructuredSummary
  selectedQuote?: ConversationTurn
  revealedEvidenceIds: string[]
  discoveredEvidenceIds: string[]
  verdict?: PlayerVerdict
  result?: VerdictScore
  setPhase: (phase: GamePhase) => void
  goToCaseSelect: () => void
  openCase: (caseId: string) => void
  setActiveCharacter: (characterId: string) => void
  startRoundtable: () => void
  addTurn: (turn: ConversationTurn) => void
  selectQuote: (turnId: string) => void
  clearQuote: () => void
  discoverEvidence: (evidenceIds: string[]) => void
  revealEvidence: (evidenceId: string) => void
  setSummary: (summary: string, summaryType: SummaryType, structuredSummary?: AI2StructuredSummary) => void
  submitVerdict: (verdict: PlayerVerdict) => void
  resetGame: () => void
}

function getInitialActiveCharacterId(caseId: string) {
  return getPlayableCharacters(getCaseDefinition(caseId))[0]?.id || ''
}

const initialOpeningTurns = (caseId: string) => {
  const caseDefinition = getCaseDefinition(caseId)
  const policeCharacter = getPoliceCharacter(caseDefinition)

  return [
    policeCharacter
      ? makeTurn(policeCharacter.id, policeCharacter.openingStatement, 'police_control')
      : makeTurn('police', '报案已经记录。现在开始圆桌问话，所有人按顺序说清楚。', 'police_control'),
    ...getPlayableCharacters(caseDefinition).map((character) => makeTurn(character.id, character.openingStatement, 'opening')),
  ]
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'home',
  currentCaseId: demoCase.id,
  activeCharacterId: getInitialActiveCharacterId(demoCase.id),
  useMockAI: false,
  turns: [],
  latestSummary: '',
  latestStructuredSummary: undefined,
  selectedQuote: undefined,
  revealedEvidenceIds: getInitialEvidence(demoCase).map((evidence) => evidence.id),
  discoveredEvidenceIds: [],
  setPhase: (phase) => set({ phase }),
  goToCaseSelect: () => set({ phase: 'case_select' }),
  openCase: (caseId) => {
    const selectedCase = caseList.find((item) => item.id === caseId)

    if (!selectedCase || selectedCase.status !== 'unlocked' || !selectedCase.caseDefinition) {
      return
    }

    const selectedCaseDefinition = selectedCase.caseDefinition

    set({
      phase: 'report',
      currentCaseId: selectedCaseDefinition.id,
      activeCharacterId: getInitialActiveCharacterId(selectedCaseDefinition.id),
      turns: [],
      latestSummary: '',
      latestStructuredSummary: undefined,
      selectedQuote: undefined,
      revealedEvidenceIds: getInitialEvidence(selectedCaseDefinition).map((evidence) => evidence.id),
      discoveredEvidenceIds: [],
      verdict: undefined,
      result: undefined,
    })
  },
  setActiveCharacter: (activeCharacterId) => set({ activeCharacterId }),
  startRoundtable: () =>
    set((state) => {
      const caseDefinition = getCaseDefinition(state.currentCaseId)

      return {
      phase: 'roundtable',
      turns: initialOpeningTurns(caseDefinition.id),
      latestSummary: '',
      latestStructuredSummary: undefined,
      selectedQuote: undefined,
      revealedEvidenceIds: getInitialEvidence(caseDefinition).map((evidence) => evidence.id),
      discoveredEvidenceIds: [],
      verdict: undefined,
      result: undefined,
      }
    }),
  addTurn: (turn) => set((state) => ({ turns: [...state.turns, turn] })),
  selectQuote: (turnId) =>
    set((state) => ({
      selectedQuote: state.turns.find((turn) => turn.id === turnId),
    })),
  clearQuote: () => set({ selectedQuote: undefined }),
  discoverEvidence: (evidenceIds) =>
    set((state) => ({
      discoveredEvidenceIds: Array.from(new Set([...state.discoveredEvidenceIds, ...evidenceIds])),
    })),
  revealEvidence: (evidenceId) =>
    set((state) => {
      if (state.revealedEvidenceIds.includes(evidenceId)) {
        return state
      }

      const caseDefinition = getCaseDefinition(state.currentCaseId)
      const policeCharacter = getPoliceCharacter(caseDefinition)
      const evidence = getEvidenceById(caseDefinition, evidenceId)

      if (!evidence) {
        return state
      }

      return {
        revealedEvidenceIds: [...state.revealedEvidenceIds, evidenceId],
        discoveredEvidenceIds: Array.from(new Set([...state.discoveredEvidenceIds, evidenceId])),
        turns: [
          ...state.turns,
          makeTurn(
            policeCharacter?.id || 'police',
            `${policeCharacter?.name || '民警'}核实结果：${evidence.title}。${evidence.content}`,
            'police_control',
            evidence.id,
          ),
        ],
      }
    }),
  setSummary: (summary, summaryType, structuredSummary) =>
    set((state) => ({
      latestSummary: summary,
      latestStructuredSummary: structuredSummary,
      turns: [...state.turns, makeTurn('ai2', summary, 'ai2_summary', summaryType)],
    })),
  submitVerdict: (verdict) =>
    set((state) => ({
      verdict,
      result: scoreVerdict(getCaseDefinition(state.currentCaseId), verdict),
      phase: 'result',
    })),
  resetGame: () =>
    set({
      phase: 'home',
      currentCaseId: demoCase.id,
      activeCharacterId: getInitialActiveCharacterId(demoCase.id),
      useMockAI: false,
      turns: [],
      latestSummary: '',
      latestStructuredSummary: undefined,
      selectedQuote: undefined,
      revealedEvidenceIds: getInitialEvidence(demoCase).map((evidence) => evidence.id),
      discoveredEvidenceIds: [],
      verdict: undefined,
      result: undefined,
    }),
}))
