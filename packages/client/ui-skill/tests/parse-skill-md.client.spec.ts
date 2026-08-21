import { describe, expect, it } from 'vitest'
import { parseSkillMarkdown } from '../src/client/parse-skill-md.ts'
import { IMPORTED_SKILL_SOURCE } from '../src/client/skill-imported.ts'

describe('parseSkillMarkdown', () => {
  it('reads name and description from YAML frontmatter', () => {
    expect(parseSkillMarkdown(
      '---\nname: review\ndescription: "PR review"\n---\n\nbody\n',
      'SKILL.md',
    )).toEqual({
      name: 'review',
      description: 'PR review',
      source: IMPORTED_SKILL_SOURCE,
    })
  })

  it('uses the file stem and first body line when frontmatter is missing', () => {
    expect(parseSkillMarkdown('# Hello\n\nmore', 'note.md')).toEqual({
      name: 'note',
      description: '# Hello',
      source: IMPORTED_SKILL_SOURCE,
    })
  })

  it('rejects SKILL.md without a name', () => {
    expect(parseSkillMarkdown('---\ndescription: only\n---\n', 'SKILL.md')).toBeNull()
    expect(parseSkillMarkdown('', 'SKILL.md')).toBeNull()
  })

  it('strips a BOM and quoted scalars', () => {
    expect(parseSkillMarkdown(
      '\uFEFF---\nname: \'mine\'\ndescription: x\n---\n',
      'SKILL.md',
    )?.name).toBe('mine')
  })
})
