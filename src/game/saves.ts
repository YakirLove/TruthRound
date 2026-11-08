import { openDB } from 'idb'
import { z } from 'zod'
import type { GameState } from '@drincs/pixi-vn'
import { create } from 'zustand'
import { caseList, getCaseDefinition, getPlayableCharacters } from './cases'
import { snapshotSession, useGameStore } from '../store/gameStore'
import { exportEngineState, restoreEngineState } from './engine'
import {
  scoreVerdict,
  buildPlayerKnowledge,
  groundStructuredSummary,
  parseAI2StructuredSummary,
  formatAI2StructuredSummary,
} from './logic'
import type { InvestigationSession } from './types'
const text = z.string().max(30000)
const turn = z.object({
  id: text,
  speakerId: text,
  targetId: text.optional(),
  content: text,
  turnType: z.enum([
    'opening',
    'player_question',
    'character_answer',
    'police_control',
    'ai2_summary',
  ]),
  timestamp: text,
  quotedTurnId: text.optional(),
  quotedExcerpt: z.object({ speakerId: text, content: text }).optional(),
})
const verdict = z.object({
  culpritIds: z.array(text),
  accompliceIds: z.array(text),
  innocentIds: z.array(text),
})
const summary = z.object({
  timeline: z.array(text),
  contradictions: z.array(text),
  suspicions: z.array(text),
  clueGaps: z.array(text),
  rawText: text.optional(),
  sources: z.record(text, z.array(text)).optional(),
})
const sessionSchema = z.object({
  sessionId: text,
  phase: z.enum([
    'home',
    'case_select',
    'report',
    'roundtable',
    'verdict',
    'result',
  ]),
  currentCaseId: text,
  activeCharacterId: text,
  questionMode: z.enum(['single', 'all']),
  draft: text,
  turns: z.array(turn).max(5000),
  selectedQuote: turn.optional(),
  revealedEvidenceIds: z.array(text),
  discoveredEvidenceIds: z.array(text),
  latestSummary: text,
  latestStructuredSummary: summary.optional(),
  verdictRoles: z.record(
    text,
    z.enum(['culprit', 'accomplice', 'innocent', 'unassigned']),
  ),
  verdict: verdict.optional(),
  result: z
    .object({
      score: z.number(),
      correctCulprit: z.boolean(),
      correctAccomplices: z.boolean(),
      correctInnocents: z.boolean(),
      explanation: text,
    })
    .optional(),
  round: z
    .object({
      id: text,
      question: text,
      targetIds: z.array(text),
      completedIds: z.array(text),
      failedIds: z.array(text),
      quote: turn.optional(),
      evidenceChecked: z.boolean(),
    })
    .optional(),
  reportStep: z.number().int().min(0).max(10),
})
export interface SaveEnvelope {
  format: 'truthround'
  version: 1
  gameVersion: '0.2.0'
  caseId: string
  caseVersion: string
  savedAt: string
  engineState: GameState
}
export function validateSave(value: unknown): SaveEnvelope {
  const parsedEnvelope = z
    .object({
      format: z.literal('truthround'),
      version: z.literal(1),
      gameVersion: z.literal('0.2.0'),
      caseId: text,
      caseVersion: text,
      savedAt: z.iso.datetime(),
      engineState: z
        .object({
          pixivn_version: z.literal('1.9.9'),
          truthround: sessionSchema,
        })
        .passthrough(),
    })
    .safeParse(value)
  if (!parsedEnvelope.success)
    throw new Error(
      '存档已损坏或版本不兼容，请选择 0.2.0 导出的有效存档。当前进度未改变。',
    )
  const envelope = parsedEnvelope.data
  const s = envelope.engineState.truthround,
    c = getCaseDefinition(envelope.caseId)
  if (c.version !== envelope.caseVersion || c.id !== s.currentCaseId)
    throw new Error('案件版本不兼容')
  if (
    s.reportStep >=
    2 +
      c.involvedParties.length +
      c.evidence.filter((e) => e.stage === 'initial').length
  )
    throw new Error('报案进度无效')
  const people = getPlayableCharacters(c).map((p) => p.id),
    ids = c.evidence.map((e) => e.id)
  if (
    !people.includes(s.activeCharacterId) ||
    Object.keys(s.verdictRoles).length !== people.length ||
    people.some((p) => !(p in s.verdictRoles))
  )
    throw new Error('人物记录无效')
  if (s.latestStructuredSummary) {
    const knowledge = buildPlayerKnowledge({
      caseDefinition: c,
      conversationHistory: s.turns,
      revealedEvidenceIds: s.revealedEvidenceIds,
    })
    const parsed = parseAI2StructuredSummary(
      JSON.stringify(s.latestStructuredSummary),
      knowledge.sources.map((source) => source.id),
    )
    s.latestStructuredSummary = groundStructuredSummary(parsed, knowledge)
    s.latestSummary = formatAI2StructuredSummary(s.latestStructuredSummary)
  }
  const unique = (items: string[]) => new Set(items).size === items.length
  if (
    !unique(s.revealedEvidenceIds) ||
    !unique(s.discoveredEvidenceIds) ||
    [...s.revealedEvidenceIds, ...s.discoveredEvidenceIds].some(
      (id) => !ids.includes(id),
    )
  )
    throw new Error('证据记录无效')
  for (const e of c.evidence) {
    if (e.stage === 'initial' && !s.revealedEvidenceIds.includes(e.id))
      throw new Error('缺少初始证据')
    if (
      e.stage === 'unlockable' &&
      s.revealedEvidenceIds.includes(e.id) &&
      !s.discoveredEvidenceIds.includes(e.id)
    )
      throw new Error('证据未经过发现阶段')
    if (
      (s.discoveredEvidenceIds.includes(e.id) ||
        s.revealedEvidenceIds.includes(e.id)) &&
      (e.requiresEvidenceIds || []).some(
        (id) => !s.revealedEvidenceIds.includes(id),
      )
    )
      throw new Error('证据前置条件缺失')
  }
  if (
    !unique(s.turns.map((t) => t.id)) ||
    s.turns.some(
      (t) =>
        !['player', 'ai2', 'police', ...c.characters.map((p) => p.id)].includes(
          t.speakerId,
        ),
    )
  )
    throw new Error('口供记录无效')
  if (
    s.selectedQuote &&
    !s.turns.some(
      (t) =>
        t.id === s.selectedQuote!.id && t.content === s.selectedQuote!.content,
    )
  )
    throw new Error('引用记录无效')
  if (s.round) {
    const r = s.round
    if (
      !unique(r.targetIds) ||
      !r.targetIds.length ||
      r.targetIds.some((id) => !people.includes(id)) ||
      !unique(r.completedIds) ||
      r.completedIds.some(
        (id) =>
          !r.targetIds.includes(id) ||
          !s.turns.some((t) => t.id === `${r.id}:${id}`),
      )
    )
      throw new Error('问话记录无效')
    r.failedIds = r.targetIds.filter((id) => !r.completedIds.includes(id))
  }
  if (s.phase === 'result' && !s.verdict) throw new Error('缺少裁决记录')
  if (s.verdict) {
    const all = [
      ...s.verdict.culpritIds,
      ...s.verdict.accompliceIds,
      ...s.verdict.innocentIds,
    ]
    if (
      !unique(all) ||
      all.length !== people.length ||
      all.some((id) => !people.includes(id))
    )
      throw new Error('裁决记录无效')
    s.result = scoreVerdict(c, s.verdict)
  }
  return envelope as unknown as SaveEnvelope
}
const database = () =>
  openDB('truthround-v1', 1, {
    upgrade(db) {
      db.createObjectStore('saves')
    },
  })
export const useSaveStatus = create<{
  message: string
  error: string
  saving: boolean
}>(() => ({ message: '', error: '', saving: false }))
let queue: Promise<unknown> = Promise.resolve()
export async function listSaves(): Promise<(SaveEnvelope | undefined)[]> {
  await queue.catch(() => {})
  const db = await database()
  return Promise.all(
    [0, 1, 2, 3].map(async (id) => {
      const value = await db.get('saves', id)
      if (!value) return undefined
      try {
        return validateSave(value)
      } catch {
        useSaveStatus.setState({
          error: `档位 ${id === 0 ? '自动' : id} 已损坏或不兼容，可使用其他档位或导入备份。`,
        })
        return undefined
      }
    }),
  )
}
export interface CaseProgress {
  phase: string
  evidence: number
  turns: number
}
export async function listCaseProgress(): Promise<
  Record<string, CaseProgress>
> {
  await queue.catch(() => {})
  const db = await database()
  const records: Record<string, CaseProgress> = {}
  for (const c of caseList.filter((c) => c.status === 'unlocked')) {
    const value = await db.get('saves', 'progress:' + c.id)
    const parsed = z
      .object({
        phase: z.enum(['report', 'roundtable', 'verdict', 'result']),
        evidence: z.number().int().min(0),
        turns: z.number().int().min(0),
      })
      .safeParse(value)
    if (parsed.success) records[c.id] = parsed.data
  }
  return records
}
export function saveSlot(slot: number) {
  const session = snapshotSession()
  const operation = async () => {
    useSaveStatus.setState({ saving: true })
    try {
      const engineState = await exportEngineState()
      engineState.truthround = session
      const c = getCaseDefinition(session.currentCaseId)
      const save: SaveEnvelope = {
        format: 'truthround',
        version: 1,
        gameVersion: '0.2.0',
        caseId: c.id,
        caseVersion: c.version,
        savedAt: new Date().toISOString(),
        engineState,
      }
      validateSave(save)
      const db = await database()
      const transaction = db.transaction('saves', 'readwrite')
      await transaction.store.put(save, slot)
      if (slot === 0 && !['home', 'case_select'].includes(session.phase))
        await transaction.store.put(
          {
            phase: session.phase,
            evidence: session.revealedEvidenceIds.length,
            turns: session.turns.length,
          },
          'progress:' + c.id,
        )
      await transaction.done
      useSaveStatus.setState({
        message: slot === 0 ? '进度已自动保存' : `已保存至档位 ${slot}`,
        error: '',
      })
      return save
    } catch (e) {
      const message = e instanceof Error ? e.message : '无法保存进度'
      useSaveStatus.setState({ error: message })
      throw e
    } finally {
      useSaveStatus.setState({ saving: false })
    }
  }
  const result = queue.catch(() => {}).then(operation)
  queue = result
  return result
}
export async function loadSave(value: unknown) {
  const save = validateSave(value)
  const session = save.engineState.truthround! as InvestigationSession
  // Validation finishes before requests are invalidated or the active game is touched.
  await queue.catch(() => {})
  await restoreEngineState({ ...save.engineState, truthround: session })
  await saveSlot(0)
}
let started = false
export function startAutosave() {
  if (started) return
  started = true
  useGameStore.subscribe((s, old) => {
    if (s.phase === 'home' || s.phase === 'case_select') return
    if (
      s.turns !== old.turns ||
      s.revealedEvidenceIds !== old.revealedEvidenceIds ||
      s.discoveredEvidenceIds !== old.discoveredEvidenceIds ||
      s.phase !== old.phase ||
      s.round !== old.round ||
      s.verdictRoles !== old.verdictRoles ||
      s.activeCharacterId !== old.activeCharacterId ||
      s.latestSummary !== old.latestSummary ||
      s.reportStep !== old.reportStep
    )
      void saveSlot(0).catch(() => {})
  })
}
export function exportSave(save: SaveEnvelope) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(save)], { type: 'application/json' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = `真相圆桌-${save.caseId}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
