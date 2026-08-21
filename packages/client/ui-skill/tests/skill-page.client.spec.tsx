// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionId, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { SkillPage, type SkillPageEntry, type SkillPageProps } from '../src/client/SkillPage.tsx'
import { SKILL_ENABLED_KEY } from '../src/client/skill-enabled.ts'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const SID = 's1' as SessionId
const t: SkillPageProps['t'] = makeTranslate(zh)

function useSessions(current: SessionId | undefined) {
  const state = { current } as SessionListState
  return <T,>(select: (snapshot: SessionListState) => T) => select(state)
}

function renderPage(
  listSkills: SkillPageProps['listSkills'],
  current: SessionId | undefined = SID,
  close = vi.fn(),
  setEnabled = vi.fn(),
  subscribe: SkillPageProps['subscribe'] = () => () => {},
) {
  const props = {
    useSessions: useSessions(current),
    listSkills,
    subscribe,
    setEnabled,
    close,
    t,
  } as unknown as SkillPageProps
  return { view: render(<SkillPage {...props} />), close, setEnabled }
}

const CATALOG: readonly SkillPageEntry[] = [
  { name: 'dsh-code-review', description: 'review flow', source: 'project-agents' },
  { name: 'dsh-badge', description: 'badge', source: 'bundled' },
  { name: 'mine', description: 'imported', source: 'user-dsh' },
]

describe('SkillPage', () => {
  it('splits 内置 and 导入, defaults new rows to checked, and keeps unchecked rows listed', async () => {
    const setEnabled = vi.fn()
    renderPage(async () => CATALOG, SID, vi.fn(), setEnabled)
    await waitFor(() => { expect(screen.getByText('dsh-code-review')).toBeTruthy() })
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('button', { name: /内置/ }).textContent).toMatch(/2/)
    expect(within(nav).getByRole('button', { name: /导入/ }).textContent).toMatch(/1/)
    expect(screen.getByText('project-agents')).toBeTruthy()
    expect(screen.queryByText('mine')).toBeNull()

    fireEvent.click(within(nav).getByRole('button', { name: /导入/ }))
    expect(screen.getByText('mine')).toBeTruthy()
    expect(screen.getByText('user-dsh')).toBeTruthy()
    expect(screen.queryByText('dsh-code-review')).toBeNull()

    fireEvent.click(within(nav).getByRole('button', { name: /内置/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: '启用 dsh-code-review' }))
    expect(setEnabled).toHaveBeenCalledWith('dsh-code-review', false)
    expect(screen.getByText('dsh-code-review')).toBeTruthy()
    expect((screen.getByRole('checkbox', { name: '启用 dsh-code-review' }) as HTMLInputElement).checked).toBe(false)
    expect(JSON.parse(localStorage.getItem(SKILL_ENABLED_KEY)!)).toEqual({ disabled: ['dsh-code-review'] })
  })

  it('shows the imported empty copy on that nav page', async () => {
    renderPage(async () => CATALOG.filter(row => isBuiltin(row.source)))
    await waitFor(() => { expect(screen.getByText('dsh-code-review')).toBeTruthy() })
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /导入/ }))
    expect(screen.getByText(zh['page.emptyImported'])).toBeTruthy()
    const search = screen.getByRole('searchbox', { name: '搜索技能' })
    const importBtn = screen.getByRole('button', { name: '导入 SKILL.md' })
    expect(importBtn.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('shows the empty copy when the catalog is empty', async () => {
    renderPage(async () => [], undefined)
    await waitFor(() => { expect(screen.getByText(zh['page.empty'])).toBeTruthy() })
  })

  it('lists catalog rows and closes back to home', async () => {
    const close = vi.fn()
    renderPage(async () => CATALOG, SID, close)
    await waitFor(() => { expect(screen.getByText('dsh-code-review')).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(close).toHaveBeenCalledOnce()
  })

  it('treats a failed catalog as empty', async () => {
    renderPage(() => Promise.reject(new Error('boom')))
    await waitFor(() => { expect(screen.getByText(zh['page.empty'])).toBeTruthy() })
  })

  it('refetches when subscribe fires and drops a settle that arrives after unmount', async () => {
    let listener!: () => void
    const subscribe = (next: () => void) => {
      listener = next
      return () => {}
    }
    let rows: readonly SkillPageEntry[] = []
    const listSkills = vi.fn(async () => rows)
    const { view } = renderPage(listSkills, SID, vi.fn(), vi.fn(), subscribe)
    await waitFor(() => { expect(listSkills).toHaveBeenCalledOnce() })
    rows = [CATALOG[0]!]
    await act(async () => { listener() })
    await waitFor(() => { expect(screen.getByText('dsh-code-review')).toBeTruthy() })

    let resolve!: (rows: readonly SkillPageEntry[]) => void
    let reject!: (reason: unknown) => void
    const first = vi.fn(() => new Promise<readonly SkillPageEntry[]>((done, fail) => {
      resolve = done
      reject = fail
    }))
    view.unmount()
    const late = renderPage(first)
    late.view.unmount()
    await act(async () => { resolve([{ name: 'late', description: 'gone', source: 'bundled' }]) })
    expect(screen.queryByText('late')).toBeNull()
    const again = renderPage(() => new Promise<readonly SkillPageEntry[]>((_done, fail) => {
      reject = fail
    }))
    again.view.unmount()
    await act(async () => { reject(new Error('late fail')) })
    expect(screen.queryByText(zh['page.empty'])).toBeNull()
  })

  it('imports a picked SKILL.md into 导入 and reports an invalid pick', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    renderPage(async () => CATALOG.filter(row => isBuiltin(row.source)))
    await waitFor(() => { expect(screen.getByText('dsh-code-review')).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: '导入 SKILL.md' }))
    expect(click).toHaveBeenCalledOnce()
    click.mockRestore()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const choose = (file?: File): void => {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: file === undefined ? { length: 0, item: () => null } : {
          0: file, length: 1, item: () => file,
        },
      })
      fireEvent.change(input)
    }
    choose()
    expect(screen.queryByRole('status')).toBeNull()

    const valid = new File(
      ['---\nname: picked\ndescription: from file\n---\n'],
      'SKILL.md',
      { type: 'text/markdown' },
    )
    await act(async () => { choose(valid) })
    await waitFor(() => { expect(screen.getByText('picked')).toBeTruthy() })
    expect(screen.getByText('from file')).toBeTruthy()
    expect(within(screen.getByRole('navigation')).getByRole('button', { name: /导入/ }).textContent)
      .toMatch(/1/)
    expect(screen.queryByRole('list')?.contains(screen.getByRole('button', { name: '导入 SKILL.md' })))
      .toBe(false)

    const second = new File(
      ['---\nname: later\ndescription: newer pick\n---\n'],
      'SKILL.md',
      { type: 'text/markdown' },
    )
    await act(async () => { choose(second) })
    await waitFor(() => { expect(screen.getByText('later')).toBeTruthy() })
    expect(screen.getByRole('list').textContent?.indexOf('later'))
      .toBeLessThan(screen.getByRole('list').textContent?.indexOf('picked') ?? 0)

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索技能' }), { target: { value: 'newer' } })
    expect(screen.getByText('later')).toBeTruthy()
    expect(screen.queryByText('picked')).toBeNull()
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索技能' }), { target: { value: 'zzzz' } })
    expect(screen.getByText(zh['page.searchEmpty'])).toBeTruthy()

    const invalid = new File(['---\ndescription: only\n---\n'], 'SKILL.md', { type: 'text/markdown' })
    await act(async () => { choose(invalid) })
    await waitFor(() => { expect(screen.getByRole('status').textContent).toBe(zh['page.importInvalid']) })

    const unreadable = new File(['x'], 'note.md', { type: 'text/markdown' })
    vi.spyOn(unreadable, 'text').mockRejectedValue(new Error('read'))
    await act(async () => { choose(unreadable) })
    await waitFor(() => { expect(screen.getByRole('status').textContent).toBe(zh['page.importInvalid']) })
  })
})

function isBuiltin(source: string): boolean {
  return source === 'bundled' || source === 'project-agents'
}
