import { describe, expect, it } from 'vitest'
import {
  addImportedSkill, IMPORTED_SKILL_SOURCE, IMPORTED_SKILLS_KEY, importedTabRows,
  loadImportedSkills, mergeSkillCatalog, saveImportedSkills,
} from '../src/client/skill-imported.ts'

function memory() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

const row = { name: 'mine', description: 'picked', source: IMPORTED_SKILL_SOURCE }

describe('imported-skill overlay', () => {
  it('starts empty and ignores invalid or blocked reads', () => {
    const store = memory()
    expect(loadImportedSkills(store)).toEqual([])
    expect(loadImportedSkills(undefined)).toEqual([])
    store.setItem(IMPORTED_SKILLS_KEY, '{')
    expect(loadImportedSkills(store)).toEqual([])
    store.setItem(IMPORTED_SKILLS_KEY, '{}')
    expect(loadImportedSkills(store)).toEqual([])
    store.setItem(IMPORTED_SKILLS_KEY, JSON.stringify([
      row,
      { name: '', description: 'x', source: 'imported' },
      { name: 'x', description: 1, source: 'imported' },
      null,
    ]))
    expect(loadImportedSkills(store)).toEqual([row])
    expect(loadImportedSkills({ getItem: () => { throw new Error('blocked') } })).toEqual([])
  })

  it('persists the overlay and ignores a blocked write', () => {
    const store = memory()
    saveImportedSkills([row], store)
    expect(store.data.get(IMPORTED_SKILLS_KEY)).toBe(JSON.stringify([row]))
    expect(() => {
      saveImportedSkills([row], { setItem: () => { throw new Error('quota') } })
    }).not.toThrow()
    saveImportedSkills([row], undefined)
  })

  it('replaces a same-name pick and lets the host catalog win', () => {
    const next = addImportedSkill(
      { ...row, description: 'newer' },
      [row, { name: 'other', description: 'kept', source: IMPORTED_SKILL_SOURCE }],
    )
    expect(next.map(item => item.name)).toEqual(['mine', 'other'])
    expect(next[0]?.description).toBe('newer')
    expect(mergeSkillCatalog(
      [{ name: 'mine', description: 'host', source: 'user-dsh' }],
      next,
    )).toEqual([
      { name: 'mine', description: 'host', source: 'user-dsh' },
      { name: 'other', description: 'kept', source: IMPORTED_SKILL_SOURCE },
    ])
    expect(importedTabRows(
      [
        { name: 'dsh-badge', description: 'bundled', source: 'bundled' },
        { name: 'mine', description: 'host', source: 'user-dsh' },
        { name: 'disk', description: 'on disk', source: 'user-dsh' },
      ],
      next,
    ).map(item => item.name)).toEqual(['mine', 'other', 'disk'])
    expect(importedTabRows(
      [{ name: 'dsh-badge', description: 'bundled', source: 'bundled' }],
      [{ name: 'dsh-badge', description: 'picked', source: IMPORTED_SKILL_SOURCE }],
    )).toEqual([])
  })
})
