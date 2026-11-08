import { z } from 'zod'
import type { CasePackage } from './types'

const text = z.string().min(1)
const character = z.object({
  id: text,
  name: text,
  roleType: z.enum(['culprit', 'accomplice', 'witness', 'innocent', 'police']),
  portrait: text,
  avatar: text,
  emotion: text,
  personality: text,
  publicBackground: text,
  privateFacts: z.array(text),
  visibleFacts: z.array(text),
  lieStrategy: text,
  speechStyle: text,
  openingStatement: text,
})
export const caseSchema = z.object({
  schemaVersion: z.literal(1),
  version: text,
  difficulty: z.number().int().min(1).max(5),
  summary: text,
  tags: z.array(text),
  id: text,
  title: text,
  incidentSummary: text,
  reportText: text,
  reporter: z.object({
    name: text,
    portrait: text,
    identity: text,
    concern: text,
    statement: text,
  }),
  involvedParties: z.array(
    z.object({ characterId: text, relationship: text, summonsReason: text }),
  ),
  sceneAssets: z.object({
    storefront: text,
    roundtable: text,
    evidenceBoard: text,
    verdictDesk: text,
    verdictResult: text,
  }),
  truthTimeline: z.array(text),
  characters: z.array(character).min(2),
  evidence: z.array(
    z.object({
      id: text,
      title: text,
      stage: z.enum(['initial', 'unlockable']),
      provider: z.enum(['police', 'ai2_or_police']),
      content: text,
      vagueLabel: text.optional(),
      discoveryLabel: text.optional(),
      triggerHint: text.optional(),
      requiresEvidenceIds: z.array(text).optional(),
    }),
  ),
  verdict: z.object({
    culpritId: text,
    accompliceIds: z.array(text),
    innocentIds: z.array(text),
    explanation: text,
  }),
})
export function validateCase(data: unknown): CasePackage {
  const value = caseSchema.parse(data)
  const people = value.characters.map((c) => c.id)
  const evidence = value.evidence.map((e) => e.id)
  if (
    new Set(people).size !== people.length ||
    new Set(evidence).size !== evidence.length
  )
    throw new Error('案件 ID 重复')
  const participants = value.characters
    .filter((c) => c.roleType !== 'police')
    .map((c) => c.id)
  const verdict = [
    value.verdict.culpritId,
    ...value.verdict.accompliceIds,
    ...value.verdict.innocentIds,
  ]
  if (
    new Set(verdict).size !== verdict.length ||
    verdict.length !== participants.length ||
    verdict.some((id) => !participants.includes(id))
  )
    throw new Error('裁决必须覆盖所有涉事人物')
  if (value.involvedParties.some((p) => !people.includes(p.characterId)))
    throw new Error('人物关系引用不存在')
  for (const item of value.evidence) {
    if (item.stage === 'unlockable' && !item.triggerHint)
      throw new Error('关键证据缺少触发条件')
    if (
      item.requiresEvidenceIds?.some(
        (id) => id === item.id || !evidence.includes(id),
      )
    )
      throw new Error('证据前置条件无效')
    const visiting = new Set<string>()
    const visit = (id: string) => {
      if (visiting.has(id)) throw new Error('证据前置条件循环')
      visiting.add(id)
      value.evidence
        .find((e) => e.id === id)
        ?.requiresEvidenceIds?.forEach(visit)
      visiting.delete(id)
    }
    visit(item.id)
  }
  return value
}
