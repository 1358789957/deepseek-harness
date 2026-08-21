// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { SidebarPageNav, type SidebarPageNavProps } from '../src/client/SidebarPageNav.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const t: SidebarPageNavProps['t'] = makeTranslate(zh)

function props(over: Partial<SidebarPageNavProps> = {}): SidebarPageNavProps {
  return {
    wide: true,
    page: 'home',
    pageId: 'jobs',
    showPage: vi.fn(),
    t,
    ...over,
  } as unknown as SidebarPageNavProps
}

describe('SidebarPageNav', () => {
  it('renders nothing on the compact rail', () => {
    const { container } = render(<SidebarPageNav {...props({ wide: false })} />)
    expect(container.innerHTML).toBe('')
  })

  it('marks the current jobs page and opens it', () => {
    const showPage = vi.fn()
    render(<SidebarPageNav {...props({ page: 'jobs', showPage })} />)
    const trigger = screen.getByRole('button', { name: '任务看板' })
    expect(trigger.getAttribute('aria-current')).toBe('page')
    fireEvent.click(trigger)
    expect(showPage).toHaveBeenCalledWith('jobs')
  })

  it('labels the schedule row and leaves aria-current unset when another page is showing', () => {
    const showPage = vi.fn()
    render(<SidebarPageNav {...props({ pageId: 'schedule', page: 'jobs', showPage })} />)
    const trigger = screen.getByRole('button', { name: '定时任务' })
    expect(trigger.getAttribute('aria-current')).toBeNull()
    fireEvent.click(trigger)
    expect(showPage).toHaveBeenCalledWith('schedule')
  })
})
