// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { SchedulePage, type SchedulePageProps } from '../src/client/SchedulePage.tsx'
import { SCHEDULED_JOBS_KEY } from '../src/client/scheduled-jobs.ts'
import { zh } from '../src/client/locales.ts'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const t: SchedulePageProps['t'] = makeTranslate(zh)
const props = { t } as unknown as SchedulePageProps

describe('SchedulePage', () => {
  it('starts empty and does not persist a blank name', () => {
    render(<SchedulePage {...props} />)
    expect(screen.getByRole('heading', { name: '定时任务' })).toBeTruthy()
    expect(screen.getByText('还没有定时任务')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    expect(screen.getByText('还没有定时任务')).toBeTruthy()
    expect(localStorage.getItem(SCHEDULED_JOBS_KEY)).toBeNull()
    fireEvent.change(screen.getByPlaceholderText('任务名称'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    expect(localStorage.getItem(SCHEDULED_JOBS_KEY)).toBeNull()
  })

  it('adds, lists, persists, and deletes a job', () => {
    const { unmount } = render(<SchedulePage {...props} />)
    fireEvent.change(screen.getByPlaceholderText('任务名称'), { target: { value: '  nightly  ' } })
    fireEvent.change(screen.getByLabelText('周期'), { target: { value: 'weekly' } })
    fireEvent.click(screen.getByRole('button', { name: '添加' }))
    expect(screen.getByText('nightly')).toBeTruthy()
    expect(screen.getByRole('cell', { name: '每周' })).toBeTruthy()
    expect(screen.getByText('已安排')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '名称' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '周期/规则' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '状态' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '下次' })).toBeTruthy()
    expect(screen.queryByText('还没有定时任务')).toBeNull()
    expect(screen.getByPlaceholderText('任务名称')).toHaveProperty('value', '')
    const stored = JSON.parse(localStorage.getItem(SCHEDULED_JOBS_KEY)!) as { name: string; cadence: string }[]
    expect(stored).toEqual([expect.objectContaining({ name: 'nightly', cadence: 'weekly' })])

    unmount()
    render(<SchedulePage {...props} />)
    expect(screen.getByText('nightly')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(screen.getByText('还没有定时任务')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(SCHEDULED_JOBS_KEY)!)).toEqual([])
  })
})
