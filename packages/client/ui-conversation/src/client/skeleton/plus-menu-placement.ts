/**
 * Place the composer plus menu from the + button rect. Prefer below the
 * button; if that would leave the viewport, open to the right. Never flip
 * up over the draft.
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
  const belowTop = anchor.bottom + GAP
  if (belowTop + menu.height <= viewport.height - MARGIN) {
    return {
      top: belowTop,
      left: clamp(anchor.left, MARGIN, viewport.width - menu.width - MARGIN),
    }
  }
  const rightLeft = anchor.right + GAP
  return {
    top: clamp(anchor.top, MARGIN, viewport.height - menu.height - MARGIN),
    left: rightLeft + menu.width <= viewport.width - MARGIN
      ? rightLeft
      : clamp(viewport.width - menu.width - MARGIN, MARGIN, viewport.width - MARGIN),
  }
}
