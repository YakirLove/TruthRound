import { describe, expect, it } from 'vitest'
import { demoCase, wutongClinicCase } from './cases'
import { scoreVerdict } from './logic'
import {
  assignVerdictRole,
  buildPlayerVerdictFromRoles,
  createInitialVerdictRoles,
  groupVerdictCharacterIdsByRole,
  isVerdictComplete,
  unassignVerdictCharacter,
  verdictRoleOptions,
} from './verdict'

describe('verdict role assignment', () => {
  it('starts with every character waiting in the top tray', () => {
    expect(createInitialVerdictRoles(demoCase.characters)).toEqual({
      lin: 'unassigned',
      qiao: 'unassigned',
      chen: 'unassigned',
      wu: 'unassigned',
    })
  })

  it('allows more than one culprit in the culprit zone', () => {
    const roles = assignVerdictRole(
      assignVerdictRole(createInitialVerdictRoles(demoCase.characters), 'lin', 'culprit'),
      'wu',
      'culprit',
    )

    expect(roles.lin).toBe('culprit')
    expect(roles.wu).toBe('culprit')
    expect(Object.values(roles).filter((role) => role === 'culprit')).toHaveLength(2)
  })

  it('can return a placed character to the top tray', () => {
    const roles = unassignVerdictCharacter(assignVerdictRole(createInitialVerdictRoles(demoCase.characters), 'lin', 'culprit'), 'lin')

    expect(roles.lin).toBe('unassigned')
    expect(isVerdictComplete(roles)).toBe(false)
  })

  it('rejects a partial verdict until all participants are assigned', () => {
    const roles = assignVerdictRole(createInitialVerdictRoles(demoCase.characters), 'lin', 'culprit')

    expect(isVerdictComplete(roles)).toBe(false)
    expect(buildPlayerVerdictFromRoles(roles)).toEqual({
      culpritIds: ['lin'],
      accompliceIds: [],
      innocentIds: [],
    })
  })

  it('derives a PlayerVerdict that still scores correctly', () => {
    const verdict = buildPlayerVerdictFromRoles({
      lin: 'culprit',
      qiao: 'accomplice',
      chen: 'innocent',
      wu: 'innocent',
    })

    expect(verdict).toEqual({
      culpritIds: ['lin'],
      accompliceIds: ['qiao'],
      innocentIds: ['chen', 'wu'],
    })
    expect(scoreVerdict(demoCase, verdict).score).toBe(100)
  })

  it('creates verdict roles from the active case characters', () => {
    expect(createInitialVerdictRoles(wutongClinicCase.characters)).toEqual({
      li: 'unassigned',
      lu: 'unassigned',
      zhao: 'unassigned',
      'zhou-granny': 'unassigned',
    })
    expect(createInitialVerdictRoles(wutongClinicCase.characters)).not.toHaveProperty('officer-zhou')
  })

  it('scores the second case verdict by culprit and innocents', () => {
    expect(
      scoreVerdict(wutongClinicCase, {
        culpritIds: ['lu'],
        accompliceIds: [],
        innocentIds: ['li', 'zhao', 'zhou-granny'],
      }).score,
    ).toBe(100)
  })

  it('defines exactly the three visible verdict role choices', () => {
    expect(verdictRoleOptions.map((option) => option.role)).toEqual(['culprit', 'accomplice', 'innocent'])
  })

  it('groups character ids by verdict role for drop zones', () => {
    expect(
      groupVerdictCharacterIdsByRole({
        lin: 'culprit',
        qiao: 'accomplice',
        chen: 'innocent',
        wu: 'innocent',
      }),
    ).toEqual({
      culprit: ['lin'],
      accomplice: ['qiao'],
      innocent: ['chen', 'wu'],
    })
  })

  it('keeps unassigned characters out of the submitted verdict', () => {
    expect(buildPlayerVerdictFromRoles(createInitialVerdictRoles(demoCase.characters))).toEqual({
      culpritIds: [],
      accompliceIds: [],
      innocentIds: [],
    })
  })
})
