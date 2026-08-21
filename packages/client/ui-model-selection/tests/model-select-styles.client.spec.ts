/**
 * Composer model trigger: fill the shrinking seat, ellipsize, hide effort.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../src/client/ModelSelect.module.css', import.meta.url)), 'utf8')

describe('ModelSelect.module.css composer trigger', () => {
  it('fills the shrinking seat and hides effort on a narrow composer row', () => {
    expect(css).toMatch(/\.root\s*\{[^}]*\bwidth:\s*100%;/)
    expect(css).toMatch(/\.trigger\s*\{[^}]*\bwidth:\s*100%;/)
    expect(css).toMatch(/\.triggerLabel\s*\{[^}]*text-overflow:\s*ellipsis;/)
    expect(css).toContain('@container (max-width: 560px)')
    expect(css).toMatch(/\.triggerEffort\s*\{[^}]*display:\s*none;/)
  })
})
