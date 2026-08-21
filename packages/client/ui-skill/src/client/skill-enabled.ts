/**
 * Per-browser enabled set for the Skill page. Newly discovered names default
 * to on; only explicit unchecks persist. Unchecked rows stay listed.
 */

/** `localStorage` key for the disabled-name set. Never seeded. */
export const SKILL_ENABLED_KEY = 'dsh.skill-enabled'

function browserStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    // Private mode or a missing storage object; treat as empty / ignore writes.
    return undefined
  }
}

/**
 * Read the disabled skill names. Invalid JSON or a blocked read yields an
 * empty set so every discovered skill starts enabled.
 * @param storage - `localStorage` or a test double.
 * @returns disabled skill names.
 */
export function loadDisabledSkills(storage: Pick<Storage, 'getItem'> | undefined = browserStorage()): Set<string> {
  if (storage === undefined) return new Set()
  try {
    const raw = storage.getItem(SKILL_ENABLED_KEY)
    if (raw === null) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || !('disabled' in parsed)) return new Set()
    const disabled = (parsed as { disabled: unknown }).disabled
    if (!Array.isArray(disabled)) return new Set()
    return new Set(disabled.filter((name): name is string => typeof name === 'string' && name !== ''))
  } catch {
    // Invalid JSON or a blocked storage read; treat every skill as enabled.
    return new Set()
  }
}

/**
 * Persist the disabled skill names. A blocked write is ignored so a private
 * mode still keeps the in-memory set for this visit.
 * @param disabled - names the user unchecked.
 * @param storage - `localStorage` or a test double.
 */
export function saveDisabledSkills(
  disabled: ReadonlySet<string>,
  storage: Pick<Storage, 'setItem'> | undefined = browserStorage(),
): void {
  if (storage === undefined) return
  try {
    storage.setItem(SKILL_ENABLED_KEY, JSON.stringify({ disabled: [...disabled] }))
  } catch {
    // Quota or a blocked storage write; the caller still holds `disabled`.
  }
}

/**
 * Toggle one skill's enabled bit.
 * @param name - skill name.
 * @param enabled - next checked state.
 * @param disabled - current disabled set.
 * @returns the next disabled set.
 */
export function setSkillEnabled(
  name: string,
  enabled: boolean,
  disabled: ReadonlySet<string>,
): Set<string> {
  const next = new Set(disabled)
  if (enabled) next.delete(name)
  else next.add(name)
  return next
}
