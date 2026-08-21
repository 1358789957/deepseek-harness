import { describe, expect, it } from 'vitest'
import { placePlusMenu } from '../src/client/skeleton/plus-menu-placement.ts'

const menu = { width: 220, height: 280 }
const viewport = { width: 800, height: 600 }

describe('placePlusMenu', () => {
  it('opens above the + button when that side fits', () => {
    expect(placePlusMenu(
      { top: 400, right: 68, bottom: 428, left: 40, width: 28, height: 28 },
      menu,
      viewport,
    )).toEqual({ top: 112, left: 40 })
  })

  it('opens to the right of + when above would leave the viewport', () => {
    expect(placePlusMenu(
      { top: 80, right: 68, bottom: 108, left: 40, width: 28, height: 28 },
      menu,
      viewport,
    )).toEqual({ top: 80, left: 76 })
  })

  it('clamps a right-side overflow instead of flipping below the button', () => {
    expect(placePlusMenu(
      { top: 80, right: 780, bottom: 108, left: 752, width: 28, height: 28 },
      menu,
      viewport,
    )).toEqual({ top: 80, left: 572 })
  })
})
