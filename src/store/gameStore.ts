import { create } from 'zustand'
import { demoCase } from '../game/cases'
import { getEvidenceById, getInitialEvidence, makeTurn, scoreVerdict } from '../game/logic'
import type { AI2StructuredSummary, ConversationTurn, PlayerVerdict, SummaryType, VerdictScore } from '../game/types'

type GamePhase = 'report' | 'roundtable' | 'verdict' | 'result'

interface GameState {
  phase: GamePhase
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

const initialOpeningTurns = () => [
  makeTurn('zhou', '街坊报案已经记录。现在开始圆桌问话，所有人按顺序说清楚。', 'police_control'),
  ...demoCase.characters
    .filter((character) => character.roleType !== 'police')
    .map((character) => makeTurn(character.id, character.openingStatement, 'opening')),
]

export const useGameStore = create<GameState>((set) => ({
  phase: 'report',
  activeCharacterId: 'lin',
  useMockAI: false,
  turns: [],
  latestSummary: '',
  latestStructuredSummary: undefined,
  selectedQuote: undefined,
  revealedEvidenceIds: getInitialEvidence(demoCase).map((evidence) => evidence.id),
  discoveredEvidenceIds: [],
  setPhase: (phase) => set({ phase }),
  setActiveCharacter: (activeCharacterId) => set({ activeCharacterId }),
  startRoundtable: () =>
    set({
      phase: 'roundtable',
      turns: initialOpeningTurns(),
      latestSummary: '',
      latestStructuredSummary: undefined,
      selectedQuote: undefined,
      revealedEvidenceIds: getInitialEvidence(demoCase).map((evidence) => evidence.id),
      discoveredEvidenceIds: [],
      verdict: undefined,
      result: undefined,
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

      const evidence = getEvidenceById(demoCase, evidenceId)

      if (!evidence) {
        return state
      }

      return {
        revealedEvidenceIds: [...state.revealedEvidenceIds, evidenceId],
        discoveredEvidenceIds: Array.from(new Set([...state.discoveredEvidenceIds, evidenceId])),
        turns: [
          ...state.turns,
          makeTurn('zhou', `老周核实结果：${evidence.title}。${evidence.content}`, 'police_control', evidence.id),
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
    set({
      verdict,
      result: scoreVerdict(demoCase, verdict),
      phase: 'result',
    }),
  resetGame: () =>
    set({
      phase: 'report',
      activeCharacterId: 'lin',
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
