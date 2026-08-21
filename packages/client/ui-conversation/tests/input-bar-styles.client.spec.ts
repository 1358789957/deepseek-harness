/**
 * Composer toolbar spacing: the model seat shrinks; modes stay off the bar.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../src/client/skeleton/InputBar.module.css', import.meta.url)), 'utf8')

function declarations(selector: string): Map<string, string> | undefined {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, ' ')
  const found = new Map<string, string>()
  for (const [, selectorList = '', body = ''] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectorList.split(',').map(value => value.trim()).includes(selector)) continue
    for (const part of body.split(';')) {
      const colon = part.indexOf(':')
      if (colon === -1) continue
      found.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim().replace(/\s+/g, ' '))
    }
  }
  return found.size === 0 ? undefined : found
}

describe('InputBar.module.css composer row', () => {
  it('gives the model seat room to shrink without crowding send', () => {
    const seat = declarations('.modelSeat')
    expect(seat?.get('flex')).toBe('1 1 7rem')
    expect(seat?.get('min-width')).toBe('0')
    expect(seat?.get('max-width')).toBe('220px')
    expect(declarations('.row')?.get('gap')).toBe('12px')
    expect(declarations('.trailing')?.get('gap')).toBe('12px')
  })
})
