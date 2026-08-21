// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { PlanProjection } from '@deepseek-ai/dsh-plan-mode/client'
import { PlanPlusItem, type PlanPlusItemProps } from '../src/client/PlanPlusItem.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const t: PlanPlusItemProps['t'] = makeTranslate(zh)

function setup(
  plan: PlanProjection | undefined,
  over: Partial<{
    locked: boolean
    enterPlanMode: PlanPlusItemProps['enterPlanMode'] | null
    exitPlanMode: PlanPlusItemProps['exitPlanMode'] | null
    onClose: () => void
  }> = {},
) {
  const store = createSnapshotStore<{ value: PlanProjection | undefined }>({ value: plan })
  const useProjection = (_key: string, selector?: (v: unknown) => unknown) =>
    bindSnapshotSelector(store)(s => (selector ?? (v => v))(s.value))
  const enterPlanMode = over.enterPlanMode === null
    ? undefined
    : over.enterPlanMode === undefined
      ? vi.fn(() => Promise.resolve<string | null>(null))
      : over.enterPlanMode
  const exitPlanMode = over.exitPlanMode === null
    ? undefined
    : over.exitPlanMode === undefined
      ? vi.fn(() => Promise.resolve<string | null>(null))
      : over.exitPlanMode
  const onClose = over.onClose ?? vi.fn()
  const props = {
    useProjection,
    locked: over.locked ?? false,
    enterPlanMode,
    exitPlanMode,
    onClose,
    t,
  } as unknown as PlanPlusItemProps
  return { view: render(<PlanPlusItem {...props} />), enterPlanMode, exitPlanMode, onClose }
}

describe('PlanPlusItem', () => {
  it('enters plan mode and closes the menu on success', async () => {
    const { enterPlanMode, onClose } = setup({ active: false, pending: false })
    fireEvent.click(screen.getByRole('menuitem', { name: 'plan mode 已关闭，按下开启' }))
    expect(screen.getByText('关')).toBeTruthy()
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(enterPlanMode).toHaveBeenCalledOnce()
  })

  it('treats a pending entry as on and exits through /plan off', async () => {
    const { exitPlanMode, onClose } = setup({ active: false, pending: true })
    fireEvent.click(screen.getByRole('menuitem', { name: 'plan mode 已开启，按下关闭' }))
    expect(screen.getByText('开')).toBeTruthy()
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(exitPlanMode).toHaveBeenCalledOnce()
  })

  it('stays disabled while locked or while the matching command is missing', () => {
    setup({ active: false, pending: false }, { locked: true })
    expect((screen.getByRole('menuitem') as HTMLButtonElement).disabled).toBe(true)
    cleanup()
    setup(undefined, { enterPlanMode: null })
    const off = screen.getByRole('menuitem', { name: 'plan mode 已关闭，按下开启' }) as HTMLButtonElement
    expect(off.disabled).toBe(true)
    fireEvent.click(off)
    cleanup()
    setup({ active: true, pending: false }, { exitPlanMode: null })
    expect((screen.getByRole('menuitem') as HTMLButtonElement).disabled).toBe(true)
  })

  it('surfaces admission and thrown failures without closing', async () => {
    const enterPlanMode = vi.fn()
      .mockResolvedValueOnce('host said no')
      .mockRejectedValueOnce(new Error('transport'))
      .mockRejectedValueOnce('raw')
    const onClose = vi.fn()
    setup({ active: false, pending: false }, { enterPlanMode, onClose })
    const row = screen.getByRole('menuitem')
    fireEvent.click(row)
    await waitFor(() => { expect(screen.getByRole('status').textContent).toBe('host said no') })
    fireEvent.click(row)
    await waitFor(() => { expect(screen.getByRole('status').textContent).toBe('transport') })
    fireEvent.click(row)
    await waitFor(() => { expect(screen.getByRole('status').textContent).toBe('raw') })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ignores a second click while the first command is in flight', async () => {
    let resolve!: (value: string | null) => void
    const enterPlanMode = vi.fn(() => new Promise<string | null>((done) => { resolve = done }))
    const { onClose } = setup({ active: false, pending: false }, { enterPlanMode })
    const row = screen.getByRole('menuitem')
    fireEvent.click(row)
    fireEvent.click(row)
    expect(enterPlanMode).toHaveBeenCalledTimes(1)
    resolve(null)
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
  })
})
