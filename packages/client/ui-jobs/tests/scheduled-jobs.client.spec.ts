import { describe, expect, it } from 'vitest'
import {
  addScheduledJob, loadScheduledJobs, nextRunAt, removeScheduledJob, saveScheduledJobs,
  scheduledJobState, SCHEDULED_JOBS_KEY,
} from '../src/client/scheduled-jobs.ts'

function memory() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

describe('scheduled-jobs storage', () => {
  it('starts empty and ignores invalid or blocked reads', () => {
    const store = memory()
    expect(loadScheduledJobs(store)).toEqual([])
    store.setItem(SCHEDULED_JOBS_KEY, '{')
    expect(loadScheduledJobs(store)).toEqual([])
    store.setItem(SCHEDULED_JOBS_KEY, '{"id":"x"}')
    expect(loadScheduledJobs(store)).toEqual([])
    expect(loadScheduledJobs({ getItem: () => { throw new Error('blocked') } })).toEqual([])
  })

  it('keeps only well-formed jobs', () => {
    const store = memory()
    store.setItem(SCHEDULED_JOBS_KEY, JSON.stringify([
      null,
      'x',
      {},
      { id: '', name: 'empty-id', cadence: 'daily', createdAt: 1 },
      { id: 'a', name: '', cadence: 'daily', createdAt: 1 },
      { id: 'a', name: 'bad', cadence: 'yearly', createdAt: 1 },
      { id: 'a', name: 'bad', cadence: 'daily', createdAt: '1' },
      { id: 'ok', name: 'nightly', cadence: 'daily', createdAt: 7 },
    ]))
    expect(loadScheduledJobs(store)).toEqual([
      { id: 'ok', name: 'nightly', cadence: 'daily', createdAt: 7 },
    ])
  })

  it('persists the list and ignores a blocked write', () => {
    const store = memory()
    const jobs = [{ id: 'ok', name: 'hourly build', cadence: 'hourly' as const, createdAt: 1 }]
    saveScheduledJobs(jobs, store)
    expect(store.data.get(SCHEDULED_JOBS_KEY)).toBe(JSON.stringify(jobs))
    expect(() => {
      saveScheduledJobs(jobs, { setItem: () => { throw new Error('quota') } })
    }).not.toThrow()
  })
})

describe('scheduled-jobs edits', () => {
  it('returns the same list when the name is empty and appends a trimmed job otherwise', () => {
    const empty = [] as const
    expect(addScheduledJob('   ', 'weekly', empty)).toBe(empty)
    const next = addScheduledJob('  nightly  ', 'daily', empty)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ name: 'nightly', cadence: 'daily' })
    expect(next[0]!.id.startsWith('sched-')).toBe(true)
  })

  it('computes the next aligned run and overdue after the first slot', () => {
    const created = 1_000
    expect(nextRunAt(created, 'hourly', created + 10)).toBe(created + 3_600_000)
    expect(scheduledJobState(created, 'hourly', created + 10)).toBe('scheduled')
    expect(scheduledJobState(created, 'hourly', created + 3_600_000)).toBe('overdue')
    expect(nextRunAt(created, 'daily', created + 3 * 86_400_000)).toBe(created + 3 * 86_400_000)
    expect(nextRunAt(created, 'weekly', created + 10)).toBe(created + 7 * 86_400_000)
  })

  it('removes by id and leaves other rows', () => {
    const jobs = [
      { id: 'keep', name: 'a', cadence: 'hourly' as const, createdAt: 1 },
      { id: 'drop', name: 'b', cadence: 'daily' as const, createdAt: 2 },
    ]
    expect(removeScheduledJob('drop', jobs)).toEqual([jobs[0]])
    expect(removeScheduledJob('missing', jobs)).toEqual(jobs)
  })
})
