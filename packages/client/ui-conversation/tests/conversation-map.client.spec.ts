// Turn grouping and jump-rail math. DOM helpers live in the jsdom view spec.

import { describe, expect, it } from 'vitest'
import {
  TITLE_LIMIT, SUMMARY_LIMIT,
  buildTurns, collectMapMessages, compactText, jumpScrollTop, markerTop,
  nextMarkerIndex, sameMapMessages, summaryLines, truncate,
} from '../src/client/chat/conversation-map.ts'

function store(entries: Array<{ key: string; kind: string; data: unknown }>) {
  const map = new Map(entries.map(entry => [entry.key, entry]))
  return { get: (key: string) => map.get(key) }
}

describe('compactText / truncate / summaryLines', () => {
  it('strips fences, links, and emphasis, then collapses whitespace', () => {
    expect(compactText('  see [docs](https://x.test) and `code` **bold**\n\n```js\n1\n```  ')).toBe('see docs and code bold')
  })

  it('ellipsizes only when the limit is exceeded', () => {
    expect(truncate('abcd', 4)).toBe('abcd')
    expect(truncate('abcde', 4)).toBe('abcd…')
  })

  it('keeps two unique sentence-like lines and drops headings or labels', () => {
    expect(summaryLines('')).toEqual([])
    expect(summaryLines('## 结果\n已完成\n第一句。第二句！太短\n第一句。')).toEqual(['第一句。', '第二句！'])
    expect(summaryLines('Completed\nAnswer:\nHello there, this is the body.')).toEqual([
      'Hello there, this is the body.',
    ])
    const long = 'x'.repeat(SUMMARY_LIMIT + 4)
    expect(summaryLines(long)[0]).toBe(`${'x'.repeat(SUMMARY_LIMIT)}…`)
  })
})

describe('collectMapMessages', () => {
  it('keeps user and non-empty assistant-step rows, skipping the rest', () => {
    const messages = collectMapMessages(
      ['u1', 'missing', 'a1', 'a-empty', 'tool', 'u2'],
      store([
        { key: 'u1', kind: 'user', data: { content: [{ type: 'text', text: 'hello' }, { type: 'image' }] } },
        { key: 'a1', kind: 'assistant-step', data: { blocks: [{ kind: 'text', text: 'world' }, { kind: 'reasoning', text: 'hidden' }] } },
        { key: 'a-empty', kind: 'assistant-step', data: { blocks: [{ kind: 'reasoning', text: 'only think' }] } },
        { key: 'tool', kind: 'tool-call', data: {} },
        { key: 'u2', kind: 'user', data: { content: 'not-an-array' } },
        { key: 'bad', kind: 'user', data: null },
      ]),
    )
    expect(messages).toEqual([
      { id: 'u1', role: 'user', body: 'hello' },
      { id: 'a1', role: 'assistant', body: 'world' },
      { id: 'u2', role: 'user', body: '' },
    ])
  })

  it('tolerates non-object node data and non-text blocks', () => {
    expect(collectMapMessages(['u'], store([
      { key: 'u', kind: 'user', data: { content: [null, 1, { type: 'text', text: 9 }, { type: 'text', text: 'ok' }] } },
    ]))).toEqual([{ id: 'u', role: 'user', body: 'ok' }])
    expect(collectMapMessages(['a'], store([
      { key: 'a', kind: 'assistant-step', data: { blocks: [null, { kind: 'text', text: 'ok' }] } },
    ]))).toEqual([{ id: 'a', role: 'assistant', body: 'ok' }])
  })

  it('compares the collected content rather than the mutable store identity', () => {
    const current = [{ id: 'a', role: 'assistant' as const, body: 'partial' }]
    expect(sameMapMessages(current, [{ ...current[0]! }])).toBe(true)
    expect(sameMapMessages(current, [{ ...current[0]!, body: 'settled' }])).toBe(false)
  })
})

describe('buildTurns', () => {
  it('groups assistant replies under the preceding user turn', () => {
    const turns = buildTurns([
      { id: 'u1', role: 'user', body: '  first question  ' },
      { id: 'a1', role: 'assistant', body: '第一句。第二句。' },
      { id: 'u2', role: 'user', body: '' },
      { id: 'a2', role: 'assistant', body: '   ' },
    ], false, '未命名消息')
    expect(turns).toHaveLength(2)
    expect(turns[0]).toMatchObject({
      id: 'turn-u1',
      anchorId: 'u1',
      title: 'first question',
      status: 'done',
      summaries: ['第一句。', '第二句。'],
    })
    expect(turns[1]).toMatchObject({
      id: 'turn-u2',
      anchorId: 'u2',
      title: '未命名消息',
      status: 'waiting',
      summaries: [],
    })
  })

  it('keeps the latest turn running after streamed summary text arrives', () => {
    const turns = buildTurns([
      { id: 'u1', role: 'user', body: 'one' },
      { id: 'a1', role: 'assistant', body: 'done reply here' },
      { id: 'u2', role: 'user', body: 'two' },
      { id: 'a2', role: 'assistant', body: 'streaming reply here' },
    ], true, 'untitled')
    expect(turns.map(turn => turn.status)).toEqual(['done', 'running'])
  })

  it('drops leading assistant prose and truncates long titles', () => {
    const title = 'q'.repeat(TITLE_LIMIT + 8)
    const turns = buildTurns([
      { id: 'orphan', role: 'assistant', body: 'no user yet' },
      { id: 'u1', role: 'user', body: title },
    ], false, 'untitled')
    expect(turns).toHaveLength(1)
    expect(turns[0]?.title).toBe(`${'q'.repeat(TITLE_LIMIT)}…`)
  })
})

describe('jump and marker math', () => {
  it('parks the jumped message below a capped focus inset', () => {
    expect(jumpScrollTop(200, 1000)).toBe(104)
    expect(jumpScrollTop(200, 200)).toBe(164)
    expect(jumpScrollTop(10, 400)).toBe(0)
  })

  it('uses a 14px natural gap and compresses markers into a short rail', () => {
    expect(markerTop(0)).toBe(8)
    expect(markerTop(1, 3, 80)).toBe(22)
    expect(markerTop(2, 3, 80)).toBe(36)
    expect(markerTop(0, 99, 400)).toBe(8)
    expect(markerTop(2, 3, 40)).toBe(32)
    expect(markerTop(2, 3, 16)).toBe(8)
  })

  it('moves ArrowUp/ArrowDown within bounds and ignores other keys', () => {
    expect(nextMarkerIndex('ArrowUp', 0, 3)).toBe(0)
    expect(nextMarkerIndex('ArrowUp', 2, 3)).toBe(1)
    expect(nextMarkerIndex('ArrowDown', 2, 3)).toBe(2)
    expect(nextMarkerIndex('ArrowDown', 0, 3)).toBe(1)
    expect(nextMarkerIndex('Enter', 1, 3)).toBe(1)
  })
})
