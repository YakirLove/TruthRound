import { describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'

describe('game store AI mode', () => {
  it('starts at the game home screen', () => {
    useGameStore.getState().resetGame()

    expect(useGameStore.getState().phase).toBe('home')
  })

  it('navigates from home to case select and opens the first case report', () => {
    useGameStore.getState().resetGame()

    useGameStore.getState().goToCaseSelect()
    expect(useGameStore.getState().phase).toBe('case_select')

    useGameStore.getState().openCase('missing-lantern-parcel')
    expect(useGameStore.getState().phase).toBe('report')
    expect(useGameStore.getState().turns).toHaveLength(0)
  })

  it('keeps locked cases from opening', () => {
    useGameStore.getState().resetGame()
    useGameStore.getState().goToCaseSelect()

    useGameStore.getState().openCase('case-2')

    expect(useGameStore.getState().phase).toBe('case_select')
  })

  it('uses real AI requests by default', () => {
    expect(useGameStore.getState().useMockAI).toBe(false)
  })

  it('selects and clears quote targets from existing turns', () => {
    useGameStore.getState().resetGame()
    useGameStore.getState().startRoundtable()
    const firstQuoteTarget = useGameStore.getState().turns[1]

    useGameStore.getState().selectQuote(firstQuoteTarget.id)

    expect(useGameStore.getState().selectedQuote?.id).toBe(firstQuoteTarget.id)

    useGameStore.getState().clearQuote()

    expect(useGameStore.getState().selectedQuote).toBeUndefined()
  })

  it('keeps transcript turns in chronological order', () => {
    useGameStore.getState().resetGame()
    useGameStore.getState().startRoundtable()

    expect(useGameStore.getState().turns.map((turn) => turn.speakerId)).toEqual([
      'zhou',
      'lin',
      'qiao',
      'chen',
      'wu',
    ])
  })

  it('starts with police evidence, discovers vague evidence, then reveals it through police', () => {
    useGameStore.getState().resetGame()
    useGameStore.getState().startRoundtable()
    const initialEvidence = useGameStore.getState().revealedEvidenceIds

    expect(initialEvidence).toContain('parcel-record')
    expect(initialEvidence).not.toContain('barbershop-reflection')
    expect(useGameStore.getState().discoveredEvidenceIds).not.toContain('barbershop-reflection')

    useGameStore.getState().discoverEvidence(['barbershop-reflection'])

    expect(useGameStore.getState().discoveredEvidenceIds).toContain('barbershop-reflection')
    expect(useGameStore.getState().revealedEvidenceIds).not.toContain('barbershop-reflection')

    useGameStore.getState().revealEvidence('barbershop-reflection')

    expect(useGameStore.getState().revealedEvidenceIds).toContain('barbershop-reflection')
    expect(useGameStore.getState().turns.at(-1)?.speakerId).toBe('zhou')
    expect(useGameStore.getState().turns.at(-1)?.turnType).toBe('police_control')
  })
})
