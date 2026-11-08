import { parse } from 'yaml'
import parcel from './case-packs/missing-lantern-parcel/case.yaml?raw'
import clinic from './case-packs/wutong-clinic-gold-ring/case.yaml?raw'
import { validateCase } from './caseSchema'
import type { CaseDefinition, CaseListItem } from './types'
const assets = import.meta.glob('/src/assets/optimized/**/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
function loadCase(source: string): CaseDefinition {
  const value = validateCase(parse(source))
  const asset = (path: string) => {
    const optimized =
      '/src/assets/optimized/' + path.slice(5).replace(/\.png$/, '.webp')
    if (!assets[optimized]) throw new Error(`案件素材不存在：${path}`)
    return assets[optimized]
  }
  value.reporter.portrait = asset(value.reporter.portrait)
  value.characters.forEach((c) => {
    c.portrait = asset(c.portrait)
    c.avatar = asset(c.avatar)
  })
  for (const key of Object.keys(
    value.sceneAssets,
  ) as (keyof typeof value.sceneAssets)[])
    value.sceneAssets[key] = asset(value.sceneAssets[key])
  return value
}
export const demoCase = loadCase(parcel)
export const wutongClinicCase = loadCase(clinic)
export function getPlayableCharacters(value: CaseDefinition) {
  return value.characters.filter((c) => c.roleType !== 'police')
}
export function getPoliceCharacter(value: CaseDefinition) {
  return value.characters.find((c) => c.roleType === 'police')
}
export const playableCharacters = getPlayableCharacters(demoCase)
export const caseList: CaseListItem[] = [
  ...[demoCase, wutongClinicCase].map((c) => ({
    id: c.id,
    title: c.title,
    difficulty: c.difficulty,
    summary: c.summary,
    tags: c.tags,
    status: 'unlocked' as const,
    caseDefinition: c,
  })),
  ...[3, 4, 5].map((n) => ({
    id: `case-${n}`,
    title: `卷宗 · ${['三', '四', '五'][n - 3]}`,
    difficulty: n,
    summary: '新的故事，尚待来访。',
    tags: ['待开放'],
    status: 'locked' as const,
  })),
]
export function getCaseDefinition(id: string): CaseDefinition {
  const value = caseList.find((c) => c.id === id)?.caseDefinition
  if (!value) throw new Error(`未知案件：${id}`)
  return value
}
