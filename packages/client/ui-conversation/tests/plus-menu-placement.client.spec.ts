import { describe, expect, it } from 'vitest'
import { placePlusMenu } from '../src/client/skeleton/plus-menu-placement.ts'

const menu = { width: 220, height: 280 }
const viewport = { width: 800, height: 600 }

describe('placePlusMenu', () => {
  it('opens below the + button when that side fits', () => {
    expect(placePlusMenu(
      { top: 200, right: 68, bottom: 228, left: 40, width: 28, height: 28 },
      menu,
      viewport,
    )).toEqual({ top: 236, left: 40 })
  })

  it('opens to the right of + when below would leave the viewport', () => {
    expect(placePlusMenu(
      { top: 400, right: 68, bottom: 428, left: 40, width: 28, height: 28 },
      menu,
      viewport,
    )).toEqual({ top: 312, left: 76 })
  })

  it('clamps a right-side overflow instead of flipping up over the draft', () => {
    expect(placePlusMenu(
      { top: 500, right: 780, bottom: 528, left: 752, width: 28, height: 28 },
      menu,
      viewport,
    )).toEqual({ top: 312, left: 572 })
  })
})
