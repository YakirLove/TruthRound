import { describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'

describe('game store AI mode', () => {
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
