import { describe, expect, it } from 'vitest'
import {
  loadDisabledSkills, saveDisabledSkills, setSkillEnabled, SKILL_ENABLED_KEY,
} from '../src/client/skill-enabled.ts'
import { isBuiltinSkillSource } from '../src/client/skill-groups.ts'

function memory() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

describe('skill-enabled storage', () => {
  it('starts empty and ignores invalid or blocked reads', () => {
    const store = memory()
    expect(loadDisabledSkills(store)).toEqual(new Set())
    expect(loadDisabledSkills(undefined)).toEqual(new Set())
    store.setItem(SKILL_ENABLED_KEY, '{')
    expect(loadDisabledSkills(store)).toEqual(new Set())
    store.setItem(SKILL_ENABLED_KEY, '{"disabled":"x"}')
    expect(loadDisabledSkills(store)).toEqual(new Set())
    store.setItem(SKILL_ENABLED_KEY, JSON.stringify({ disabled: ['ok', '', 1] }))
    expect(loadDisabledSkills(store)).toEqual(new Set(['ok']))
    expect(loadDisabledSkills({ getItem: () => { throw new Error('blocked') } })).toEqual(new Set())
  })

  it('persists the disabled set and ignores a blocked write', () => {
    const store = memory()
    saveDisabledSkills(new Set(['a', 'b']), store)
    expect(store.data.get(SKILL_ENABLED_KEY)).toBe(JSON.stringify({ disabled: ['a', 'b'] }))
    expect(() => {
      saveDisabledSkills(new Set(['a']), { setItem: () => { throw new Error('quota') } })
    }).not.toThrow()
    saveDisabledSkills(new Set(['x']), undefined)
  })

  it('toggles one name and defaults new names to enabled', () => {
    const empty = new Set<string>()
    const off = setSkillEnabled('review', false, empty)
    expect(off).toEqual(new Set(['review']))
    expect(setSkillEnabled('review', true, off)).toEqual(new Set())
  })
})

describe('skill groups', () => {
  it('puts bundled and project-agents on 内置', () => {
    expect(isBuiltinSkillSource('bundled')).toBe(true)
    expect(isBuiltinSkillSource('project-agents')).toBe(true)
    expect(isBuiltinSkillSource('user-dsh')).toBe(false)
    expect(isBuiltinSkillSource('custom')).toBe(false)
    expect(isBuiltinSkillSource('project-dsh')).toBe(false)
    expect(isBuiltinSkillSource('imported')).toBe(false)
  })
})
