/** Pure helpers for the conversation jump rail (turn grouping and scroll math). */

/** Pointer dwell before the first turn preview opens. */
export const HOVER_PREVIEW_DELAY_MS = 300
/** Grace period for moving from a marker into its preview. */
export const HOVER_PREVIEW_HOLD_MS = 420
/** Maximum user-prompt characters retained in a marker title. */
export const TITLE_LIMIT = 40
/** Maximum assistant-text characters retained in one preview line. */
export const SUMMARY_LIMIT = 66
/** Scrollport-height ratio used to select the active marker. */
export const FOCUS_LINE_RATIO = 0.34
/** Scrollport-height ratio placed above a jumped message. */
export const JUMP_TOP_RATIO = 0.18
/** Maximum pixel inset placed above a jumped message. */
export const JUMP_TOP_MAX_PX = 96
/** Smallest measured height used by marker layout. */
export const MIN_RAIL_HEIGHT = 80

/** One user or assistant row the rail can summarize. */
export interface ConversationMapMessage {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly body: string
}

/** Store face the collector reads — matches the live Chat node store. */
export interface ConversationMapStore {
  get(key: string): { readonly key: string; readonly kind: string; readonly data: unknown } | undefined
}

/** Preview status for one user-started turn. */
export type ConversationTurnStatus = 'done' | 'running' | 'waiting'

/** One rail marker: a user turn plus the assistant replies that follow it. */
export interface ConversationTurn {
  readonly id: string
  readonly anchorId: string
  readonly title: string
  readonly summaries: readonly string[]
  readonly status: ConversationTurnStatus
}

/**
 * Resolve the conversation scrollport: the column host when nested, otherwise
 * the local chat scroller.
 * @param from - an element inside the chat flow.
 * @returns the element that actually scrolls.
 */
export function conversationScroller(from: HTMLElement): HTMLElement {
  return from.closest('[data-conversation-scroll]') ?? from
}

/**
 * Flatten markdown-ish prose into a single preview line.
 * @param value - raw message text.
 * @returns compacted plain text.
 */
export function compactText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)]\([^\s)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Ellipsize a string at a hard character limit.
 * @param value - already-compacted text.
 * @param limit - maximum kept characters.
 * @returns the original or a truncated form ending in `…`.
 */
export function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit)}…` : value
}

/**
 * Pick up to two sentence-like summary lines from assistant prose.
 * @param value - raw assistant text, possibly markdown.
 * @returns at most two unique preview lines.
 */
export function summaryLines(value: string): string[] {
  const plain = value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)]\([^\s)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim()
  if (!plain) return []

  const blocks = plain
    .split(/\n+/)
    .flatMap(line => line.split(/(?<=[。！？!?；;])\s*/))
    .map(line => line.replace(/^(?:#{1,6}\s*|[-+•·]\s*|\d+[.)、]\s*)/, '').replace(/\s+/g, ' ').trim())
    .filter(line => line.length >= 4 && !/^(?:已完成|完成|结果|回答|Completed|Done|Result|Answer)[:：]?$/i.test(line))

  return [...new Set(blocks)]
    .slice(0, 2)
    .map(line => truncate(line, SUMMARY_LIMIT))
}

function textBlocks(value: unknown, kindKey: 'type' | 'kind'): string {
  if (!Array.isArray(value)) return ''
  const parts: string[] = []
  for (const block of value) {
    if (block === null || typeof block !== 'object') continue
    const record = block as { type?: unknown; kind?: unknown; text?: unknown }
    if (record[kindKey] === 'text' && typeof record.text === 'string') parts.push(record.text)
  }
  return parts.join('')
}

/**
 * Project ordered Chat nodes into the rail's user/assistant message list.
 * Steering, tools, and chrome rows are skipped so one marker stays one user turn.
 * @param order - visible Chat node keys.
 * @param store - live node store.
 * @returns messages in flow order.
 */
export function collectMapMessages(
  order: readonly string[],
  store: ConversationMapStore,
): ConversationMapMessage[] {
  const messages: ConversationMapMessage[] = []
  for (const key of order) {
    const node = store.get(key)
    if (node === undefined) continue
    if (node.kind === 'user') {
      messages.push({ id: node.key, role: 'user', body: textBlocks(node.data && typeof node.data === 'object'
        ? (node.data as { content?: unknown }).content
        : undefined, 'type') })
      continue
    }
    if (node.kind === 'assistant-step') {
      const body = textBlocks(node.data && typeof node.data === 'object'
        ? (node.data as { blocks?: unknown }).blocks
        : undefined, 'kind')
      if (body.trim() !== '') messages.push({ id: node.key, role: 'assistant', body })
    }
  }
  return messages
}

/**
 * Compare collected rail messages after a live snapshot notification.
 * @param left - previous collected messages.
 * @param right - next collected messages.
 * @returns whether message identity, role, and preview text are unchanged.
 */
export function sameMapMessages(
  left: readonly ConversationMapMessage[],
  right: readonly ConversationMapMessage[],
): boolean {
  return left.length === right.length && left.every((message, index) => {
    const other = right[index]
    return other !== undefined
      && message.id === other.id
      && message.role === other.role
      && message.body === other.body
  })
}

/**
 * Group user messages and the assistant replies that follow them into turns.
 * @param messages - collected user/assistant rows.
 * @param running - whether the session currently has a live turn.
 * @param untitled - fallback title when the user body is empty.
 * @returns one turn per user message.
 */
export function buildTurns(
  messages: readonly ConversationMapMessage[],
  running: boolean,
  untitled: string,
): ConversationTurn[] {
  const grouped: Array<{ id: string; anchorId: string; title: string; replies: string[] }> = []
  for (const message of messages) {
    if (message.role === 'user') {
      const title = compactText(message.body) || untitled
      grouped.push({
        id: `turn-${message.id}`,
        anchorId: message.id,
        title: truncate(title, TITLE_LIMIT),
        replies: [],
      })
      continue
    }
    const current = grouped.at(-1)
    if (current !== undefined && message.body.trim() !== '') current.replies.push(message.body)
  }
  return grouped.map((turn, index) => {
    const summaries = summaryLines(turn.replies.join('\n'))
    const isLatest = index === grouped.length - 1
    return {
      ...turn,
      summaries,
      status: running && isLatest ? 'running' : summaries.length > 0 ? 'done' : 'waiting',
    }
  })
}

/**
 * Message top relative to the scroller's content origin.
 * @param scroller - the conversation scrollport.
 * @param anchor - the message node.
 * @returns content-space Y of the message's top edge.
 */
export function messageScrollTop(scroller: HTMLElement, anchor: HTMLElement): number {
  return anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
}

/**
 * Target scrollTop that parks a jumped message just below the focus band.
 * @param anchorTop - message top in content coordinates.
 * @param clientHeight - visible scroller height.
 * @returns clamped scrollTop.
 */
export function jumpScrollTop(anchorTop: number, clientHeight: number): number {
  return Math.max(0, anchorTop - Math.min(JUMP_TOP_MAX_PX, clientHeight * JUMP_TOP_RATIO))
}

/**
 * Find the flow row tagged for one message id without interpolating a selector.
 * @param root - scroller or any ancestor that contains the rows.
 * @param id - `data-conversation-message` value.
 * @returns the matching element, or null.
 */
export function findMessageElement(root: ParentNode, id: string): HTMLElement | null {
  for (const element of root.querySelectorAll<HTMLElement>('[data-conversation-message]')) {
    if (element.dataset.conversationMessage === id) return element
  }
  return null
}

/**
 * Turn whose message sits on or above the focus line (~34% from the top).
 * @param turns - rail turns in order.
 * @param scroller - the conversation scrollport.
 * @returns the active turn id, or empty when there are no turns.
 */
export function activeTurnId(
  turns: readonly Pick<ConversationTurn, 'id' | 'anchorId'>[],
  scroller: HTMLElement,
): string {
  const first = turns[0]
  if (first === undefined) return ''
  const focusLine = scroller.scrollTop + scroller.clientHeight * FOCUS_LINE_RATIO
  const anchors = new Map<string, HTMLElement>()
  for (const element of scroller.querySelectorAll<HTMLElement>('[data-conversation-message]')) {
    const id = element.dataset.conversationMessage
    if (id !== undefined) anchors.set(id, element)
  }
  let next = first.id
  for (const turn of turns) {
    const anchor = anchors.get(turn.anchorId)
    if (anchor !== undefined && messageScrollTop(scroller, anchor) <= focusLine) next = turn.id
  }
  return next
}

/** Fixed gap between stacked rail ticks, in px. */
export const MARKER_GAP_PX = 14

/**
 * Marker Y uses the natural gap while it fits, then compresses into the rail.
 * @param index - zero-based marker index.
 * @param count - total marker count.
 * @param railHeight - available rail height.
 * @returns CSS `top` in px.
 */
export function markerTop(index: number, count = 1, railHeight = MIN_RAIL_HEIGHT): number {
  const inset = 8
  if (count <= 1) return inset
  const available = Math.max(0, railHeight - inset * 2)
  const gap = Math.min(MARKER_GAP_PX, available / (count - 1))
  return inset + index * gap
}

/**
 * Visible rail height: the scrollport minus the sticky composer, floored.
 * @param scroller - the conversation scrollport.
 * @returns height in px, at least {@link MIN_RAIL_HEIGHT}.
 */
export function visibleRailHeight(scroller: HTMLElement): number {
  const composer = scroller.querySelector<HTMLElement>('[data-composer-seat]')
  const reserved = composer === null ? 24 : composer.offsetHeight + 24
  return Math.max(MIN_RAIL_HEIGHT, scroller.clientHeight - reserved)
}

/**
 * Whether the user asked the OS to reduce motion.
 * @returns true when the reduce-motion media query matches.
 */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Scroll the conversation to a turn's message row.
 * @param scroller - the conversation scrollport.
 * @param anchorId - `data-conversation-message` of the user turn.
 * @param reduceMotion - skip smooth scrolling when true.
 * @returns whether an anchor was found and scrolled.
 */
export function jumpToMessage(scroller: HTMLElement, anchorId: string, reduceMotion: boolean): boolean {
  const anchor = findMessageElement(scroller, anchorId)
  if (anchor === null) return false
  scroller.scrollTo({
    top: jumpScrollTop(messageScrollTop(scroller, anchor), scroller.clientHeight),
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
  return true
}

/**
 * Keyboard-focus preview should only open for visible focus, not pointer click.
 * @param target - the focused marker.
 * @returns whether the focus ring is visible.
 */
export function isFocusVisible(target: Element): boolean {
  try {
    return target.matches(':focus-visible')
  } catch {
    return false
  }
}

/**
 * Next marker index for ArrowUp / ArrowDown.
 * @param key - the keydown key.
 * @param index - current marker index.
 * @param count - total markers.
 * @returns the next index, or the current index when the key is unrelated.
 */
export function nextMarkerIndex(key: string, index: number, count: number): number {
  if (key === 'ArrowUp') return Math.max(0, index - 1)
  if (key === 'ArrowDown') return Math.min(count - 1, index + 1)
  return index
}
