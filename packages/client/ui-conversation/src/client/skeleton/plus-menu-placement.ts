/**
 * Place the composer plus menu from the + button rect. Open to the right
 * of +, bottom-aligned with the button so the panel covers the draft.
 * Flip to the left only when the right side would leave the viewport.
 */

/** Axis-aligned box used for placement. */
export interface PlusMenuBox {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

/** Viewport used for the plus-menu clamp. */
export interface PlusMenuViewport {
  width: number
  height: number
}

/** Fixed `top` / `left` for the plus menu. */
export interface PlusMenuOrigin {
  top: number
  left: number
}

const GAP = 8
const MARGIN = 8

/**
 * Clamp `value` into `[min, max]`, collapsing an inverted range to `min`.
 * @param value - candidate coordinate.
 * @param min - inclusive lower bound.
 * @param max - inclusive upper bound.
 * @returns the clamped coordinate.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/**
 * Compute a fixed origin for the plus menu.
 * @param anchor - + button rect.
 * @param menu - measured menu size.
 * @param viewport - window inner size.
 * @returns `top` / `left` in CSS pixels.
 */
export function placePlusMenu(
  anchor: PlusMenuBox,
  menu: Pick<PlusMenuBox, 'width' | 'height'>,
  viewport: PlusMenuViewport,
): PlusMenuOrigin {
  const top = clamp(anchor.bottom - menu.height, MARGIN, viewport.height - menu.height - MARGIN)
  const rightLeft = anchor.right + GAP
  if (rightLeft + menu.width <= viewport.width - MARGIN) {
    return { top, left: rightLeft }
  }
  const leftLeft = anchor.left - GAP - menu.width
  return {
    top,
    left: leftLeft >= MARGIN
      ? leftLeft
      : clamp(MARGIN, MARGIN, viewport.width - menu.width - MARGIN),
  }
}
