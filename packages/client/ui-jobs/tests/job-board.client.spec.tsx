// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { JobView, SessionId, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { JobBoard, type JobBoardProps } from '../src/client/JobBoard.tsx'
import { zh } from '../src/client/locales.ts'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const A = 'session-a' as SessionId
const B = 'session-b' as SessionId
const START = 1_700_000_000_000
const t: JobBoardProps['t'] = makeTranslate(zh)

function job(over: Partial<JobView> = {}): JobView {
  return {
    id: 'bash-1' as JobView['id'],
    kind: 'bash',
    label: 'pnpm run build',
    status: 'running',
    startedAt: START,
    ...over,
  }
}

function props(
  jobsBySession: SessionListState['jobsBySession'] | undefined,
  titles: Record<string, { displayTitle: string }> = {},
  openSession = vi.fn(),
): JobBoardProps {
  const state = {
    ids: Object.keys(titles) as SessionId[],
    byId: titles,
    current: A,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: jobsBySession ?? {},
    currentAddress: undefined,
  } as SessionListState
  return {
    useSessions: <T,>(select: (snapshot: SessionListState) => T) => select(state),
    openSession,
    t,
  } as unknown as JobBoardProps
}

function rowCells(): string[][] {
  return within(screen.getByRole('list', { name: zh['list.aria'] }))
    .getAllByRole('listitem')
    .map(row => [...row.querySelectorAll('span')]
      .map(cell => cell.textContent ?? '')
      .filter(text => text !== ''))
}

describe('JobBoard', () => {
  it('renders the official empty copy when no session has jobs', () => {
    render(<JobBoard {...props(undefined)} />)
    expect(screen.getByRole('heading', { name: '任务看板' })).toBeTruthy()
    expect(screen.getByText('暂无任务')).toBeTruthy()
    expect(screen.getByText('进行中的任务会显示在这里')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('flattens every session, shows titles, and opens the owning session', () => {
    const openSession = vi.fn()
    render(<JobBoard {...props({
      [A]: [job({ label: 'from a' })],
      [B]: [job({
        id: 'bash-2' as JobView['id'],
        label: 'from b',
        status: 'completed',
        finishedAt: START + 4_000,
      })],
    }, {
      [A]: { displayTitle: 'Build' },
      [B]: { displayTitle: '' },
    }, openSession)} />)
    expect(rowCells()[0]).toEqual(['bash', 'from a', 'Build', '运行中', '0秒'])
    expect(rowCells()[1]).toEqual(['bash', 'from b', '已完成', '4秒'])
    fireEvent.click(screen.getByRole('button', { name: /from a/ }))
    expect(openSession).toHaveBeenCalledWith(A)
  })

  it('prefers producer detail and advances only live rows', () => {
    vi.setSystemTime(START + 1_000)
    render(<JobBoard {...props({
      [A]: [
        job({ label: 'live' }),
        job({
          id: 'bash-2' as JobView['id'],
          label: 'done',
          status: 'failed',
          detail: 'exit 1',
          finishedAt: START + 2_000,
        }),
      ],
    })} />)
    expect(rowCells()[0]).toContain('1秒')
    expect(rowCells()[1]).toContain('exit 1')
    act(() => { vi.advanceTimersByTime(2_000) })
    expect(rowCells()[0]).toContain('3秒')
    expect(rowCells()[1]).toContain('2秒')
  })
})
