// @vitest-environment jsdom
// Conversation jump rail: hover preview, click jump, keyboard, active tracking.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { ConversationMap } from '../src/client/chat/ConversationMap.tsx'
import {
  activeTurnId, conversationScroller, findMessageElement, isFocusVisible,
  jumpToMessage, messageScrollTop, prefersReducedMotion, visibleRailHeight,
  type ConversationMapMessage,
} from '../src/client/chat/conversation-map.ts'
import { zh } from '../src/client/locales.ts'

const t = makeTranslate(zh, commonZh)

const twoTurns: ConversationMapMessage[] = [
  { id: 'u1', role: 'user', body: 'first question' },
  { id: 'a1', role: 'assistant', body: '第一句回复。第二句补充。' },
  { id: 'u2', role: 'user', body: 'second question' },
]

const waitingTurns: ConversationMapMessage[] = [
  { id: 'u1', role: 'user', body: 'first question' },
  { id: 'a1', role: 'assistant', body: 'already answered here' },
  { id: 'u2', role: 'user', body: 'still waiting' },
]

function layout(element: HTMLElement, top: number, height = 40): void {
  const rect: DOMRect = {
    top, bottom: top + height, left: 0, right: 40, width: 40, height,
    x: 0, y: top, toJSON: () => ({}),
  }
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect)
}

class ImmediateResizeObserver {
  static instances: ImmediateResizeObserver[] = []
  readonly cb: ResizeObserverCallback
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
    ImmediateResizeObserver.instances.push(this)
  }
  observe(): void { this.cb([], this) }
  disconnect(): void {}
  unobserve(): void {}
}

function Harness({
  messages = twoTurns,
  running = false,
  withComposer = false,
  onManualNavigate,
  scrollerRef,
}: {
  messages?: readonly ConversationMapMessage[]
  running?: boolean
  withComposer?: boolean
  onManualNavigate?: () => void
  scrollerRef?: { current: HTMLDivElement | null }
}) {
  const listRef = useRef<HTMLDivElement | null>(null)
  return (
    <div
      ref={(node) => {
        listRef.current = node
        if (scrollerRef !== undefined) scrollerRef.current = node
      }}
      data-conversation-scroll=""
      data-testid="scroller"
    >
      <ConversationMap
        messages={messages}
        running={running}
        listRef={listRef}
        {...(onManualNavigate === undefined ? {} : { onManualNavigate })}
        t={t}
      />
      {messages.filter(message => message.role === 'user').map(message => (
        <div key={message.id} data-conversation-message={message.id}>{message.body}</div>
      ))}
      {withComposer && <div data-composer-seat="" style={{ height: 80 }} />}
    </div>
  )
}

let frames: FrameRequestCallback[] = []

beforeEach(() => {
  frames = []
  ImmediateResizeObserver.instances = []
  vi.stubGlobal('ResizeObserver', ImmediateResizeObserver)
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames[id - 1] = () => {}
  })
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('DOM helpers', () => {
  it('resolves the column scrollport and finds tagged messages', () => {
    const root = document.createElement('div')
    const inner = document.createElement('div')
    inner.setAttribute('data-conversation-scroll', '')
    const row = document.createElement('div')
    row.dataset.conversationMessage = 'u1'
    inner.append(row)
    root.append(inner)
    expect(conversationScroller(row)).toBe(inner)
    expect(conversationScroller(root)).toBe(root)
    expect(findMessageElement(inner, 'u1')).toBe(row)
    expect(findMessageElement(inner, 'missing')).toBeNull()
  })

  it('computes content-space tops, the active turn, and rail height', () => {
    const scroller = document.createElement('div')
    const a = document.createElement('div')
    const b = document.createElement('div')
    a.dataset.conversationMessage = 'u1'
    b.dataset.conversationMessage = 'u2'
    scroller.append(a, b)
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 100, writable: true })
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 200 })
    layout(scroller, 0, 200)
    layout(a, -20, 40)
    layout(b, 80, 40)
    expect(messageScrollTop(scroller, a)).toBe(80)
    expect(activeTurnId([], scroller)).toBe('')
    expect(activeTurnId([
      { id: 'turn-u1', anchorId: 'u1' },
      { id: 'turn-u2', anchorId: 'u2' },
      { id: 'turn-missing', anchorId: 'nope' },
    ], scroller)).toBe('turn-u1')
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 200 })
    layout(a, -140, 40)
    layout(b, -40, 40)
    expect(activeTurnId([
      { id: 'turn-u1', anchorId: 'u1' },
      { id: 'turn-u2', anchorId: 'u2' },
    ], scroller)).toBe('turn-u2')

    const composer = document.createElement('div')
    composer.setAttribute('data-composer-seat', '')
    Object.defineProperty(composer, 'offsetHeight', { value: 80 })
    scroller.append(composer)
    expect(visibleRailHeight(scroller)).toBe(96)
    const bare = document.createElement('div')
    Object.defineProperty(bare, 'clientHeight', { value: 40 })
    expect(visibleRailHeight(bare)).toBe(80)
  })

  it('jumps with reduced-motion auto behavior and reports a miss', () => {
    const scroller = document.createElement('div')
    const row = document.createElement('div')
    row.dataset.conversationMessage = 'u1'
    scroller.append(row)
    Object.defineProperty(scroller, 'clientHeight', { value: 400 })
    Object.defineProperty(scroller, 'scrollTop', { value: 0, writable: true })
    layout(scroller, 0, 400)
    layout(row, 200, 40)
    const scrollTo = vi.fn()
    scroller.scrollTo = scrollTo
    expect(jumpToMessage(scroller, 'missing', false)).toBe(false)
    expect(jumpToMessage(scroller, 'u1', true)).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({ top: 128, behavior: 'auto' })
    expect(jumpToMessage(scroller, 'u1', false)).toBe(true)
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 128, behavior: 'smooth' })
  })

  it('reads reduced-motion and focus-visible, including a selector throw', () => {
    expect(prefersReducedMotion()).toBe(false)
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
    }))
    expect(prefersReducedMotion()).toBe(true)
    vi.stubGlobal('matchMedia', undefined)
    expect(prefersReducedMotion()).toBe(false)

    const el = document.createElement('button')
    expect(isFocusVisible(el)).toBe(false)
    Object.defineProperty(el, 'matches', {
      configurable: true,
      value: (selector: string) => {
        if (selector === ':focus-visible') throw new Error('unsupported')
        return false
      },
    })
    expect(isFocusVisible(el)).toBe(false)
    Object.defineProperty(el, 'matches', {
      configurable: true,
      value: (selector: string) => selector === ':focus-visible',
    })
    expect(isFocusVisible(el)).toBe(true)
  })
})

describe('ConversationMap', () => {
  it('hides until there are two user turns', () => {
    const empty = render(<Harness messages={[]} />)
    expect(empty.queryByRole('navigation')).toBeNull()
    empty.unmount()
    const one = render(<Harness messages={[{ id: 'u1', role: 'user', body: 'only' }]} />)
    expect(one.queryByRole('navigation')).toBeNull()
  })

  it('renders one marker per user turn and jumps on click', () => {
    const onManualNavigate = vi.fn()
    const view = render(<Harness onManualNavigate={onManualNavigate} withComposer />)
    const nav = view.getByRole('navigation', { name: '对话消息地图' })
    const first = view.getByRole('button', { name: '跳到对话：first question' })
    const second = view.getByRole('button', { name: '跳到对话：second question' })
    expect(nav.contains(first)).toBe(true)
    const scroller = view.getByTestId('scroller')
    const scrollTo = vi.fn()
    scroller.scrollTo = scrollTo
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 400 })
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 0, writable: true })
    layout(scroller, 0, 400)
    const anchor = scroller.querySelector('[data-conversation-message="u2"]') as HTMLElement
    layout(anchor, 240, 40)
    fireEvent.click(second)
    expect(onManualNavigate).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenCalledWith({ top: 168, behavior: 'smooth' })
    expect(second.getAttribute('aria-current')).toBe('step')
  })

  it('shows a delayed hover preview, holds it, then dismisses', () => {
    vi.useFakeTimers()
    const view = render(<Harness />)
    const first = view.getByRole('button', { name: '跳到对话：first question' })
    const second = view.getByRole('button', { name: '跳到对话：second question' })
    fireEvent.mouseEnter(first)
    expect(view.queryByRole('tooltip')).toBeNull()
    act(() => { vi.advanceTimersByTime(300) })
    expect(view.getByRole('tooltip').textContent).toContain('first question')
    expect(view.getByRole('tooltip').textContent).toContain('已完成')
    expect(view.getByRole('tooltip').textContent).toContain('第一句回复。')
    fireEvent.mouseEnter(first)
    fireEvent.mouseEnter(second)
    expect(view.getByRole('tooltip').textContent).toContain('second question')
    fireEvent.mouseLeave(second)
    const card = view.getByRole('tooltip')
    fireEvent.mouseEnter(card)
    act(() => { vi.advanceTimersByTime(420) })
    expect(view.getByRole('tooltip')).toBeTruthy()
    fireEvent.mouseLeave(card)
    act(() => { vi.advanceTimersByTime(420) })
    expect(view.queryByRole('tooltip')).toBeNull()
  })

  it('uses generating and empty preview copy for a live unanswered turn', () => {
    vi.useFakeTimers()
    const view = render(<Harness messages={waitingTurns} running />)
    const waiting = view.getByRole('button', { name: '跳到对话：still waiting' })
    fireEvent.mouseEnter(waiting)
    act(() => { vi.advanceTimersByTime(300) })
    expect(view.getByRole('tooltip').textContent).toContain('生成中')
    expect(view.getByRole('tooltip').textContent).toContain('正在生成本轮回复…')
    view.unmount()
    const idle = render(<Harness messages={waitingTurns} running={false} />)
    const idleMarker = idle.getByRole('button', { name: '跳到对话：still waiting' })
    fireEvent.mouseEnter(idleMarker)
    act(() => { vi.advanceTimersByTime(300) })
    expect(idle.getByRole('tooltip').textContent).toContain('等待回复')
    expect(idle.getByRole('tooltip').textContent).toContain('这一轮还没有回复内容。')
  })

  it('moves focus with arrows and ignores unrelated keys', () => {
    const view = render(<Harness />)
    const first = view.getByRole('button', { name: '跳到对话：first question' })
    const second = view.getByRole('button', { name: '跳到对话：second question' })
    first.focus()
    fireEvent.keyDown(first, { key: 'Enter' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(second)
    fireEvent.keyDown(second, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(second)
    fireEvent.keyDown(second, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(first)
  })

  it('opens a preview on visible focus and skips pointer focus', () => {
    vi.useFakeTimers()
    const view = render(<Harness />)
    const first = view.getByRole('button', { name: '跳到对话：first question' })
    Object.defineProperty(first, 'matches', { configurable: true, value: () => false })
    fireEvent.focus(first)
    act(() => { vi.advanceTimersByTime(300) })
    expect(view.queryByRole('tooltip')).toBeNull()
    Object.defineProperty(first, 'matches', {
      configurable: true,
      value: (selector: string) => selector === ':focus-visible',
    })
    fireEvent.focus(first)
    act(() => { vi.advanceTimersByTime(300) })
    expect(view.getByRole('tooltip')).toBeTruthy()
    fireEvent.blur(first)
    act(() => { vi.advanceTimersByTime(420) })
    expect(view.queryByRole('tooltip')).toBeNull()
  })

  it('tracks the active marker from scroll and coalesces rAF', () => {
    const view = render(<Harness />)
    const scroller = view.getByTestId('scroller')
    const first = view.getByRole('button', { name: '跳到对话：first question' })
    const second = view.getByRole('button', { name: '跳到对话：second question' })
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 0, writable: true })
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 200 })
    layout(scroller, 0, 200)
    const a = scroller.querySelector('[data-conversation-message="u1"]') as HTMLElement
    const b = scroller.querySelector('[data-conversation-message="u2"]') as HTMLElement
    layout(a, 0, 40)
    layout(b, 180, 40)
    fireEvent.scroll(scroller)
    fireEvent.scroll(scroller)
    expect(frames).toHaveLength(1)
    act(() => { frames[0]?.(0) })
    expect(first.getAttribute('aria-current')).toBe('step')
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 200 })
    layout(a, -200, 40)
    layout(b, -20, 40)
    fireEvent.scroll(scroller)
    act(() => { frames.at(-1)?.(1) })
    expect(second.getAttribute('aria-current')).toBe('step')
  })

  it('does not jump when the scroller or the anchor is missing', () => {
    const listRef = { current: null as HTMLElement | null }
    const view = render(
      <ConversationMap messages={twoTurns} running={false} listRef={listRef} t={t} />,
    )
    fireEvent.click(view.getByRole('button', { name: '跳到对话：first question' }))
    const scroller = document.createElement('div')
    const scrollTo = vi.fn()
    scroller.scrollTo = scrollTo
    listRef.current = scroller
    fireEvent.click(view.getByRole('button', { name: '跳到对话：second question' }))
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('respects reduced motion and still jumps without an onManualNavigate hook', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
    }))
    const view = render(<Harness />)
    const scroller = view.getByTestId('scroller')
    const scrollTo = vi.fn()
    scroller.scrollTo = scrollTo
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 400 })
    layout(scroller, 0, 400)
    const anchor = scroller.querySelector('[data-conversation-message="u1"]') as HTMLElement
    layout(anchor, 120, 40)
    fireEvent.click(view.getByRole('button', { name: '跳到对话：first question' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 48, behavior: 'auto' })
  })

  it('clears hover timers on unmount and works without ResizeObserver', () => {
    vi.useFakeTimers()
    vi.stubGlobal('ResizeObserver', undefined)
    const view = render(<Harness messages={[{ id: 'u1', role: 'user', body: 'only' }]} />)
    expect(view.queryByRole('navigation')).toBeNull()
    view.unmount()
    const live = render(<Harness />)
    const marker = live.getByRole('button', { name: '跳到对话：first question' })
    fireEvent.mouseLeave(marker)
    fireEvent.mouseEnter(marker)
    live.unmount()
    act(() => { vi.advanceTimersByTime(800) })
  })

  it('cancels a pending active-refresh frame on unmount', () => {
    const view = render(<Harness />)
    fireEvent.scroll(view.getByTestId('scroller'))
    expect(frames).not.toHaveLength(0)
    view.unmount()
  })
})
