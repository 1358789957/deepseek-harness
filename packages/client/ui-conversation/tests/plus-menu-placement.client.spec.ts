import { describe, expect, it } from 'vitest'
import { placePlusMenu } from '../src/client/skeleton/plus-menu-placement.ts'

const menu = { width: 220, height: 280 }
const viewport = { width: 800, height: 600 }

describe('placePlusMenu', () => {
  it('opens to the right of +, bottom-aligned with the button', () => {
    expect(placePlusMenu(
      { top: 400, right: 68, bottom: 428, left: 40, width: 28, height: 28 },
      menu,
      viewport,
    )).toEqual({ top: 148, left: 76 })
  })

  it('flips to the left of + when the right side would leave the viewport', () => {
    expect(placePlusMenu(
      { top: 400, right: 780, bottom: 428, left: 752, width: 28, height: 28 },
      menu,
      viewport,
    )).toEqual({ top: 148, left: 524 })
  })

  it('clamps a left-side overflow instead of flipping below the button', () => {
    expect(placePlusMenu(
      { top: 80, right: 230, bottom: 108, left: 202, width: 28, height: 28 },
      menu,
      { width: 250, height: 600 },
    )).toEqual({ top: 8, left: 8 })
  })
})
