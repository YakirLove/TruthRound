import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { snapshotSession, useGameStore } from '../store/gameStore'
import {
  listCaseProgress,
  listSaves,
  loadSave,
  saveSlot,
  validateSave,
} from './saves'
import { demoCase, wutongClinicCase } from './cases'
import { exportEngineState } from './engine'
vi.mock('./engine', () => ({
  exportEngineState: vi.fn(async () => ({ pixivn_version: '1.9.9' })),
  restoreEngineState: async (s: {
    truthround: ReturnType<typeof snapshotSession>
  }) => useGameStore.getState().restoreSession(s.truthround),
}))
beforeEach(() => {
  useGameStore.getState().openCase(demoCase.id)
  useGameStore.getState().startRoundtable()
})
describe('versioned saves', () => {
  it('waits for pending autosave before offering Continue from the menu', async () => {
    let finish!: () => void
    vi.mocked(exportEngineState).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () =>
            resolve({ pixivn_version: '1.9.9' } as Awaited<
              ReturnType<typeof exportEngineState>
            >)
        }),
    )
    const saving = saveSlot(0)
    let listed = false
    const listing = listSaves().then((slots) => {
      listed = true
      return slots
    })
    await vi.waitFor(() => expect(finish).toBeDefined())
    expect(listed).toBe(false)
    finish()
    const [saved, slots] = await Promise.all([saving, listing])
    expect(slots[0]?.savedAt).toBe(saved.savedAt)
  })
  it('retains separate case progress when the autosave switches cases', async () => {
    await saveSlot(0)
    useGameStore.getState().openCase(wutongClinicCase.id)
    useGameStore.getState().startRoundtable()
    await saveSlot(0)
    const progress = await listCaseProgress()
    expect(progress[demoCase.id].phase).toBe('roundtable')
    expect(progress[wutongClinicCase.id].phase).toBe('roundtable')
    expect((await listSaves())[0]?.caseId).toBe(wutongClinicCase.id)
  })
  it('roundtrips transcript, quote, evidence, character and verdict draft through IndexedDB', async () => {
    const s = useGameStore.getState()
    s.discoverEvidence(['tire-scratch'])
    s.revealEvidence('tire-scratch')
    s.selectQuote(useGameStore.getState().turns[1].id)
    s.setActiveCharacter('qiao')
    useGameStore.setState((s) => ({
      verdictRoles: { ...s.verdictRoles, lin: 'culprit' },
      draft: '保留问题',
    }))
    const id = useGameStore.getState().sessionId
    await saveSlot(1)
    const saved = (await listSaves())[1]!
    useGameStore.getState().resetGame()
    await loadSave(saved)
    const restored = useGameStore.getState()
    expect(restored.sessionId).not.toBe(id)
    expect(restored.activeCharacterId).toBe('qiao')
    expect(restored.draft).toBe('保留问题')
    expect(restored.selectedQuote).toBeDefined()
    expect(restored.verdictRoles.lin).toBe('culprit')
    expect(restored.revealedEvidenceIds).toContain('tire-scratch')
  })
  it('does not touch current game or autosave for incompatible and corrupt imports', async () => {
    const saved = await saveSlot(0),
      before = snapshotSession()
    for (const bad of [
      { ...saved, version: 99 },
      { ...saved, caseVersion: 'missing' },
      { ...saved, caseId: 'missing' },
      {
        ...saved,
        engineState: {
          ...saved.engineState,
          truthround: {
            ...saved.engineState.truthround,
            revealedEvidenceIds: ['hidden'],
          },
        },
      },
    ])
      await expect(loadSave(bad)).rejects.toThrow()
    expect(snapshotSession()).toEqual(before)
    expect((await listSaves())[0]).toEqual(saved)
  })
  it('restores unfinished requests as retryable without calling transport', async () => {
    useGameStore.setState({
      round: {
        id: 'pending',
        question: '未完成',
        targetIds: ['lin'],
        completedIds: [],
        failedIds: [],
        evidenceChecked: false,
      },
    })
    const save = await saveSlot(2)
    const parsed = validateSave(save)
    expect(parsed.engineState.truthround?.round?.failedIds).toEqual(['lin'])
    await loadSave(save)
    expect(useGameStore.getState().round?.failedIds).toEqual(['lin'])
  })
})

it('isolates a corrupt IndexedDB slot while retaining valid backups', async () => {
  const db = await openDB('truthround-v1', 1)
  const good = await saveSlot(1)
  await db.put('saves', { ...good, caseId: 'broken' }, 0)
  const saves = await listSaves()
  expect(saves[0]).toBeUndefined()
  expect(saves[1]?.caseId).toBe(good.caseId)
  expect((await db.get('saves', 0)).caseId).toBe('broken')
})
