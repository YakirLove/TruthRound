import type { CharacterDefinition, PlayerVerdict } from './types'

export type VerdictRole = 'culprit' | 'accomplice' | 'innocent'
export type VerdictAssignment = VerdictRole | 'unassigned'

export const verdictRoleOptions: { role: VerdictRole; label: string }[] = [
  { role: 'culprit', label: '主谋' },
  { role: 'accomplice', label: '包庇者' },
  { role: 'innocent', label: '无辜者' },
]

export function createInitialVerdictRoles(characters: CharacterDefinition[]): Record<string, VerdictAssignment> {
  return characters
    .filter((character) => character.roleType !== 'police')
    .reduce(
      (roles, character) => ({
        ...roles,
        [character.id]: 'unassigned' as const,
      }),
      {} as Record<string, VerdictAssignment>,
    )
}

export function assignVerdictRole(
  currentRoles: Record<string, VerdictAssignment>,
  characterId: string,
  role: VerdictRole,
): Record<string, VerdictAssignment> {
  return {
    ...currentRoles,
    [characterId]: role,
  }
}

export function unassignVerdictCharacter(
  currentRoles: Record<string, VerdictAssignment>,
  characterId: string,
): Record<string, VerdictAssignment> {
  return {
    ...currentRoles,
    [characterId]: 'unassigned',
  }
}

export function isVerdictComplete(roles: Record<string, VerdictAssignment>): boolean {
  return Object.values(roles).length > 0 && Object.values(roles).every((role) => role !== 'unassigned')
}

export function buildPlayerVerdictFromRoles(roles: Record<string, VerdictAssignment>): PlayerVerdict {
  return {
    culpritIds: Object.entries(roles)
      .filter(([, role]) => role === 'culprit')
      .map(([id]) => id),
    accompliceIds: Object.entries(roles)
      .filter(([, role]) => role === 'accomplice')
      .map(([id]) => id),
    innocentIds: Object.entries(roles)
      .filter(([, role]) => role === 'innocent')
      .map(([id]) => id),
  }
}

export function groupVerdictCharacterIdsByRole(roles: Record<string, VerdictAssignment>): Record<VerdictRole, string[]> {
  return verdictRoleOptions.reduce(
    (groups, option) => ({
      ...groups,
      [option.role]: Object.entries(roles)
        .filter(([, role]) => role === option.role)
        .map(([id]) => id),
    }),
    { culprit: [], accomplice: [], innocent: [] } as Record<VerdictRole, string[]>,
  )
}
