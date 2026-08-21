import { describe, expect, it } from 'vitest'
import {
  EMPTY_CHAT_SNAPSHOT, EMPTY_CONVERSATION_VIEWS,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {
  ConversationSnapshot, RunningToolCall, SessionId, ToolResultNode,
} from '@deepseek-ai/dsh-client-runtime/client'
import { reviewBasename, reviewChanges, sameReviewChanges } from '../src/client/skeleton/review-material.ts'
import { chatSnapshotFixture } from './chat-snapshot-fixture.client.ts'

const SID = 's1' as SessionId

function snapshot(over: Partial<ConversationSnapshot> = {}): ConversationSnapshot {
  const nodes = over.nodes ?? []
  const runningCalls = over.runningCalls ?? []
  return {
    sessionId: SID, views: EMPTY_CONVERSATION_VIEWS,
    chat: over.chat ?? chatSnapshotFixture({ nodes, runningCalls }),
    nodes, turnTimings: new Map(), turnEnds: new Map(), partial: null, runningCalls,
    pending: [], queue: [], running: false, composerPhase: 'active', removed: false,
    openState: 'open', openError: null, hasMore: false, loadingOlder: false,
    promptError: null, blank: false, subagent: null, lastAgentError: null, ...over,
  }
}

const settled = (over?: Partial<ToolResultNode>): ToolResultNode => ({
  kind: 'tool-result', seq: 10, time: 2_000, callId: 'c1',
  call: { name: 'edit', argsRaw: '{}' },
  callTime: 1_000,
  content: [{ type: 'text', text: 'ok' }], isError: false,
  callView: null,
  resultView: {
    card: 'diff', title: 'Edit notes/demo.txt',
    diffs: [{ path: 'notes/demo.txt', oldText: 'hello\n', newText: 'hello fixture\nworld\n' }],
  },
  subCalls: [],
  ...over,
})

describe('reviewChanges', () => {
  it('is empty when the snapshot has no mutation cards', () => {
    expect(reviewChanges(snapshot({ chat: EMPTY_CHAT_SNAPSHOT }))).toEqual({
      files: [], added: null, removed: null, produced: [],
    })
  })

  it('counts added and removed lines from real diff hunks', () => {
    const changes = reviewChanges(snapshot({ nodes: [settled()] }))
    expect(changes.files).toEqual([{ path: 'notes/demo.txt', added: 2, removed: 1 }])
    expect(changes.added).toBe(2)
    expect(changes.removed).toBe(1)
  })

  it('lists edit locations without inventing +/- when hunks are absent', () => {
    const changes = reviewChanges(snapshot({
      nodes: [settled({
        resultView: { card: 'generic', kind: 'edit', locations: [{ path: 'src/a.ts' }] } as ToolResultNode['resultView'],
      })],
    }))
    expect(changes.files).toEqual([{ path: 'src/a.ts' }])
    expect(changes.added).toBeNull()
    expect(changes.removed).toBeNull()
  })

  it('keeps produced-only paths out of the changed-file list', () => {
    const chat = chatSnapshotFixture({ turnTimings: new Map([[1, { startTime: 1 }]]) })
    const turn = chat.timeline.turns.get(1)
    if (turn === undefined) throw new Error('fixture turn missing')
    const data = turn.data as typeof turn.data & { set(key: string, value: unknown): void }
    data.set('deliverables', { produced: [{ path: 'artifacts/report.pdf' }] })
    expect(reviewChanges(snapshot({ chat }))).toEqual({
      files: [],
      added: null,
      removed: null,
      produced: ['artifacts/report.pdf'],
    })
  })

  it('skips failed mutations and still walks nested subcalls', () => {
    const child: ToolResultNode = settled({
      callId: 'c1:n1',
      resultView: { card: 'diff', title: 'Write nested.ts', diffs: [{ path: 'nested.ts', oldText: null, newText: 'x\n' }] },
    })
    const failed: ToolResultNode = settled({
      isError: true,
      resultView: { card: 'diff', title: 'Edit failed.ts', diffs: [{ path: 'failed.ts', oldText: 'a', newText: 'b' }] },
      subCalls: [child],
    })
    const changes = reviewChanges(snapshot({ nodes: [failed] }))
    expect(changes.files.map(file => file.path)).toEqual(['nested.ts'])
    expect(changes.files[0]).toEqual({ path: 'nested.ts', added: 1, removed: 0 })
  })

  it('includes a running write\'s intended hunks', () => {
    const running: RunningToolCall = {
      callId: 'r1', name: 'write', argsRaw: '{}', turn: 1, step: 1, time: 1,
      callView: { card: 'diff', title: 'Write new.ts', diffs: [{ path: 'new.ts', oldText: null, newText: 'one\ntwo\n' }] },
      subCalls: [],
    }
    const changes = reviewChanges(snapshot({ runningCalls: [running] }))
    expect(changes.files).toEqual([{ path: 'new.ts', added: 2, removed: 0 }])
  })

  it('sameReviewChanges is structural', () => {
    const a = reviewChanges(snapshot({ nodes: [settled()] }))
    const b = reviewChanges(snapshot({ nodes: [settled()] }))
    expect(sameReviewChanges(a, b)).toBe(true)
    expect(sameReviewChanges(a, { ...a, added: 9 })).toBe(false)
  })
})

describe('reviewBasename', () => {
  it('returns the trailing segment', () => {
    expect(reviewBasename('src/client/a.ts')).toBe('a.ts')
    expect(reviewBasename('a.ts')).toBe('a.ts')
    expect(reviewBasename('win\\b.ts')).toBe('b.ts')
  })
})
