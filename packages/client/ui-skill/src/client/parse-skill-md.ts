/**
 * Parse a user-picked SKILL.md (or a flat `name.md` skill file) into a
 * catalog row. Host discovery still owns on-disk catalogs; this read only
 * feeds the Skill page's 导入 overlay.
 */
import { IMPORTED_SKILL_SOURCE, type ImportedSkill } from './skill-imported.ts'

/**
 * Read a YAML-frontmatter scalar from a `---` block.
 * @param block - text between the opening and closing fences.
 * @param key - frontmatter key.
 * @returns trimmed value, or empty when the key is absent.
 */
function field(block: string, key: string): string {
  const prefix = `${key}:`
  const line = block.split(/\r?\n/).find(row => row.startsWith(prefix))
  if (line === undefined) return ''
  return line.slice(prefix.length).trim().replace(/^['"]|['"]$/g, '')
}

/**
 * First non-empty body line, used when frontmatter has no description.
 * @param body - markdown after the frontmatter fence.
 * @returns trimmed line, or empty.
 */
function firstLine(body: string): string {
  return body.split(/\r?\n/).map(line => line.trim()).find(line => line !== '') ?? ''
}

/**
 * File-stem fallback when the pick is a flat `name.md` rather than `SKILL.md`.
 * @param fileName - `File.name` from the picker.
 * @returns stem, or empty for `SKILL.md` (that name must come from frontmatter).
 */
function stemName(fileName: string): string {
  const base = fileName.replace(/\\/g, '/').split('/').pop() ?? ''
  const stem = base.replace(/\.md$/i, '')
  if (stem === '' || stem.toLowerCase() === 'skill') return ''
  return stem
}

/**
 * Parse one picked skill file.
 * @param text - file contents.
 * @param fileName - picker file name.
 * @returns a catalog row, or `null` when no name can be recovered.
 */
export function parseSkillMarkdown(text: string, fileName: string): ImportedSkill | null {
  const trimmed = text.replace(/^\uFEFF/, '')
  const fence = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  const body = fence === null ? trimmed : trimmed.slice(fence[0].length)
  const name = field(fence?.[1] ?? '', 'name') || stemName(fileName)
  if (name === '') return null
  return {
    name,
    description: field(fence?.[1] ?? '', 'description') || firstLine(body),
    source: IMPORTED_SKILL_SOURCE,
  }
}
