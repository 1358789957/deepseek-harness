/**
 * Split the skill catalog into 内置 (bundled + project `.agents/skills`)
 * and 导入 (everything the user or project imported).
 */

/** Discovery sources that belong on the 内置 nav page. */
const BUILTIN_SOURCES = new Set(['bundled', 'project-agents'])

/**
 * True when a catalog row is a repo-shipped / bundled skill.
 * @param source - `skill.list` source string.
 * @returns whether the row belongs under 内置.
 */
export function isBuiltinSkillSource(source: string): boolean {
  return BUILTIN_SOURCES.has(source)
}
