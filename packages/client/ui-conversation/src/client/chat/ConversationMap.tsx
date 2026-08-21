// Left-gutter conversation jump rail: one marker per user turn, hover preview,
// click-to-jump. Interaction matches a left-gutter conversation map; chrome uses DSH
// tokens. The rail sits on the LEFT so the chat scrollbar stays on the RIGHT.

import {
  useEffect, useMemo, useRef, useState,
} from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import clsx from 'clsx'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import {
  HOVER_PREVIEW_DELAY_MS, HOVER_PREVIEW_HOLD_MS,
  activeTurnId, buildTurns, conversationScroller, isFocusVisible,
  jumpToMessage, markerTop, nextMarkerIndex, prefersReducedMotion,
  visibleRailHeight,
  type ConversationMapMessage, type ConversationTurn, type ConversationTurnStatus,
} from './conversation-map.ts'
import css from './ConversationMap.module.css'

const STATUS_KEY = {
  done: 'map.status.done',
  running: 'map.status.running',
  waiting: 'map.status.waiting',
} as const satisfies Record<ConversationTurnStatus, 'map.status.done' | 'map.status.running' | 'map.status.waiting'>

const PREVIEW_EDGE_CLEARANCE_PX = 88

export interface ConversationMapProps {
  readonly messages: readonly ConversationMapMessage[]
  readonly running: boolean
  readonly listRef: RefObject<HTMLElement | null>
  readonly onManualNavigate?: () => void
  readonly t: ChatViewSlotProps['t']
}

function resolveScroller(listRef: RefObject<HTMLElement | null>): HTMLElement | null {
  return listRef.current === null ? null : conversationScroller(listRef.current)
}

/**
 * Thin left rail over a long thread: hover a tick to preview that turn, click
 * to jump the conversation scroller there.
 * @param props - collected messages, running bit, list ref, optional navigate hook, locale seat.
 * @returns the rail, or null when fewer than two user turns are loaded.
 */
export function ConversationMap({
  messages, running, listRef, onManualNavigate, t,
}: ConversationMapProps) {
  const turns = useMemo(
    () => buildTurns(messages, running, t('map.untitled')),
    [messages, running, t],
  )
  const [activeId, setActiveId] = useState('')
  const [hoveredId, setHoveredId] = useState('')
  const [previewTop, setPreviewTop] = useState(PREVIEW_EDGE_CLEARANCE_PX)
  const [railHeight, setRailHeight] = useState(360)
  const rootRef = useRef<HTMLElement>(null)
  const markerRefs = useRef(new Map<string, HTMLButtonElement>())
  const hoverTimerRef = useRef<number | null>(null)
  const dismissTimerRef = useRef<number | null>(null)

  const cancelHoverTimer = (): void => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }

  const holdPreview = (): void => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
  }

  const cancelPreview = (): void => {
    cancelHoverTimer()
    if (hoveredId === '') return
    holdPreview()
    dismissTimerRef.current = window.setTimeout(() => {
      dismissTimerRef.current = null
      setHoveredId('')
    }, HOVER_PREVIEW_HOLD_MS)
  }

  useEffect(() => {
    if (turns.length < 2) return
    const root = rootRef.current
    const scroller = resolveScroller(listRef)
    if (root === null && scroller === null) return
    const updateRailHeight = (): void => {
      if (scroller !== null) setRailHeight(visibleRailHeight(scroller))
      else if (root !== null) setRailHeight(Math.max(80, root.clientHeight))
    }
    updateRailHeight()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateRailHeight)
    if (root !== null) observer.observe(root)
    if (scroller !== null) observer.observe(scroller)
    const composer = scroller?.querySelector<HTMLElement>('[data-composer-seat]')
    if (composer !== null && composer !== undefined) observer.observe(composer)
    return () => { observer.disconnect() }
  }, [listRef, turns.length])

  useEffect(() => {
    if (turns.length < 2) {
      setActiveId('')
      return
    }
    const scroller = resolveScroller(listRef)
    if (scroller === null) {
      setActiveId('')
      return
    }

    let frame = 0
    const refresh = (): void => {
      frame = 0
      const next = activeTurnId(turns, scroller)
      setActiveId(current => current === next ? current : next)
    }
    const scheduleRefresh = (): void => {
      if (frame) return
      frame = window.requestAnimationFrame(refresh)
    }

    refresh()
    scroller.addEventListener('scroll', scheduleRefresh, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleRefresh)
    observer?.observe(scroller)
    for (const element of scroller.querySelectorAll<HTMLElement>('[data-conversation-message]')) {
      observer?.observe(element)
    }

    return () => {
      scroller.removeEventListener('scroll', scheduleRefresh)
      observer?.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [listRef, turns])

  const showPreview = (turnId: string, marker: HTMLElement): void => {
    const rootRect = rootRef.current?.getBoundingClientRect()
    const markerRect = marker.getBoundingClientRect()
    if (rootRect !== undefined) {
      const markerCenter = markerRect.top - rootRect.top + markerRect.height / 2
      const safeTop = Math.min(
        Math.max(markerCenter, PREVIEW_EDGE_CLEARANCE_PX),
        Math.max(PREVIEW_EDGE_CLEARANCE_PX, railHeight - PREVIEW_EDGE_CLEARANCE_PX),
      )
      setPreviewTop(safeTop)
    }
    setHoveredId(turnId)
  }

  const schedulePreview = (turnId: string, marker: HTMLElement): void => {
    holdPreview()
    if (turnId === hoveredId) return
    cancelHoverTimer()
    if (hoveredId !== '') {
      showPreview(turnId, marker)
      return
    }
    hoverTimerRef.current = window.setTimeout(() => {
      hoverTimerRef.current = null
      showPreview(turnId, marker)
    }, HOVER_PREVIEW_DELAY_MS)
  }

  useEffect(() => () => {
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current)
    if (dismissTimerRef.current !== null) window.clearTimeout(dismissTimerRef.current)
  }, [])

  const jumpToTurn = (turn: ConversationTurn): void => {
    const scroller = resolveScroller(listRef)
    if (scroller === null) return
    if (!jumpToMessage(scroller, turn.anchorId, prefersReducedMotion())) return
    onManualNavigate?.()
    setActiveId(turn.id)
  }

  const handleMarkerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const nextIndex = nextMarkerIndex(event.key, index, turns.length)
    const next = turns[nextIndex]
    if (next === undefined) return
    markerRefs.current.get(next.id)?.focus()
  }

  if (turns.length < 2) return null
  const preview = turns.find(turn => turn.id === hoveredId)

  return (
    <nav className={css.host} aria-label={t('map.aria')} ref={rootRef}>
      <div className={css.rail} style={{ height: railHeight }}>
        {turns.map((turn, index) => {
          const isActive = turn.id === activeId
          const isPreviewed = turn.id === hoveredId
          return (
            <button
              className={clsx(css.marker, isActive && css.active, isPreviewed && css.previewed)}
              type="button"
              key={turn.id}
              ref={(node) => {
                if (node) markerRefs.current.set(turn.id, node)
                else markerRefs.current.delete(turn.id)
              }}
              style={{ top: markerTop(index, turns.length, railHeight) }}
              tabIndex={isActive || (activeId === '' && index === 0) ? 0 : -1}
              aria-label={t('map.jump', { title: turn.title })}
              aria-current={isActive ? 'step' : undefined}
              aria-describedby={isPreviewed ? 'conversation-map-preview' : undefined}
              onClick={() => { jumpToTurn(turn) }}
              onMouseEnter={(event) => { schedulePreview(turn.id, event.currentTarget) }}
              onMouseLeave={cancelPreview}
              onFocus={(event) => {
                if (isFocusVisible(event.currentTarget)) {
                  schedulePreview(turn.id, event.currentTarget)
                }
              }}
              onBlur={cancelPreview}
              onKeyDown={(event) => { handleMarkerKeyDown(event, index) }}
            >
              <span />
            </button>
          )
        })}
      </div>

      {preview !== undefined && (
        <aside
          className={css.preview}
          id="conversation-map-preview"
          role="tooltip"
          style={{ top: previewTop }}
          onMouseEnter={holdPreview}
          onMouseLeave={cancelPreview}
        >
          <div className={css.previewHead}>
            <strong>{preview.title}</strong>
            <span data-status={preview.status}>{t(STATUS_KEY[preview.status])}</span>
          </div>
          <ul>
            {(preview.summaries.length > 0 ? preview.summaries : [
              preview.status === 'running' ? t('map.preview.running') : t('map.preview.empty'),
            ]).map(line => <li key={line}>{line}</li>)}
          </ul>
        </aside>
      )}
    </nav>
  )
}
