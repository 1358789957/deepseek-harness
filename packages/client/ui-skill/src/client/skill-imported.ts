/**
 * Client-local overlay of SKILL.md files the user picked on the Skill page.
 * Host `skill.list` still owns on-disk catalogs; a pick that later appears
 * there wins by name. Never seeded. Overlay order is newest first.
 */

import { isBuiltinSkillSource } from './skill-groups.ts'

/** Discovery source stamped on a user-picked file that is not yet on disk. */
export const IMPORTED_SKILL_SOURCE = 'imported'

/** `localStorage` key for the imported-skill overlay. */
export const IMPORTED_SKILLS_KEY = 'dsh.imported-skills'

/** One user-picked skill row on the Skill page. */
export interface ImportedSkill {
  name: string
  description: string
  source: string
}

function browserStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    // Private mode or a missing storage object; treat as empty / ignore writes.
    return undefined
  }
}

/**
 * True when `value` can be shown as an imported skill row.
 * @param value - unknown JSON value.
 * @returns whether the value has a non-empty name.
 */
function isImportedSkill(value: unknown): value is ImportedSkill {
  if (value === null || typeof value !== 'object') return false
  const row = value as Partial<ImportedSkill>
  return typeof row.name === 'string'
    && row.name !== ''
    && typeof row.description === 'string'
    && typeof row.source === 'string'
    && row.source !== ''
}

/**
 * Read the imported-skill overlay. Invalid JSON or a blocked read yields
 * an empty list so the page still opens.
 * @param storage - `localStorage` or a test double.
 * @returns stored rows, newest first.
 */
export function loadImportedSkills(
  storage: Pick<Storage, 'getItem'> | undefined = browserStorage(),
): ImportedSkill[] {
  if (storage === undefined) return []
  try {
    const raw = storage.getItem(IMPORTED_SKILLS_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isImportedSkill)
  } catch {
    // Invalid JSON or a blocked storage read; start empty rather than crash.
    return []
  }
}

/**
 * Persist the imported-skill overlay. A blocked write is ignored so a
 * private mode still keeps the in-memory list for this visit.
 * @param skills - the full overlay.
 * @param storage - `localStorage` or a test double.
 */
export function saveImportedSkills(
  skills: readonly ImportedSkill[],
  storage: Pick<Storage, 'setItem'> | undefined = browserStorage(),
): void {
  if (storage === undefined) return
  try {
    storage.setItem(IMPORTED_SKILLS_KEY, JSON.stringify(skills))
  } catch {
    // Quota or a blocked storage write; the caller still holds `skills`.
  }
}

/**
 * Insert or replace one imported row by name.
 * @param row - parsed pick.
 * @param existing - current overlay.
 * @returns the next overlay, newest first.
 */
export function addImportedSkill(
  row: ImportedSkill,
  existing: readonly ImportedSkill[],
): ImportedSkill[] {
  return [row, ...existing.filter(item => item.name !== row.name)]
}

/**
 * Merge a host catalog with the local overlay. Catalog names win so a file
 * that later appears through `skills/change` keeps its host source.
 * @param catalog - `skill.list` rows.
 * @param imported - local overlay.
 * @returns catalog first, then overlay names the host does not already list.
 */
export function mergeSkillCatalog<T extends { name: string }>(
  catalog: readonly T[],
  imported: readonly T[],
): T[] {
  const names = new Set(catalog.map(row => row.name))
  return [...catalog, ...imported.filter(row => !names.has(row.name))]
}

/**
 * Rows for the 导入 tab: overlay newest first (host fields win by name),
 * then host non-builtin names the overlay does not list.
 * @param catalog - merged host + overlay catalog.
 * @param imported - local overlay, newest first.
 * @returns imported-tab rows.
 */
export function importedTabRows<T extends { name: string; source: string }>(
  catalog: readonly T[],
  imported: readonly T[],
): T[] {
  const hostByName = new Map(catalog.map(row => [row.name, row]))
  const overlay: T[] = []
  const seen = new Set<string>()
  for (const row of imported) {
    const host = hostByName.get(row.name)
    if (host !== undefined && isBuiltinSkillSource(host.source)) continue
    const next = host ?? row
    overlay.push(next)
    seen.add(next.name)
  }
  return [
    ...overlay,
    ...catalog.filter(row => !isBuiltinSkillSource(row.source) && !seen.has(row.name)),
  ]
}
