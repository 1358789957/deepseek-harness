// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { AgentPresetOption } from '../src/client/settings-store.ts'
import type { AgentPresetSeatState } from '../src/client/seat-store.ts'
import { AgentPresetPlusMenu, type AgentPresetPlusMenuProps } from '../src/client/AgentPresetPlusMenu.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const t: AgentPresetPlusMenuProps['t'] = makeTranslate(zh)

const BUILT_IN: AgentPresetOption[] = [
  { id: 'standard', trust: 'system' },
  { id: 'code', trust: 'system' },
  { id: 'minimal', trust: 'system' },
  { id: 'cordis', trust: 'system' },
  { id: 'mine', trust: 'user', name: 'Mine' },
]

function setup(state: Partial<AgentPresetSeatState> = {}, select = vi.fn(() => Promise.resolve())) {
  const store = createSnapshotStore<AgentPresetSeatState>({
    options: [],
    current: '',
    error: null,
    busy: false,
    introduce: false,
    ...state,
  })
  const load = vi.fn(() => Promise.resolve())
  const onClose = vi.fn()
  const props = {
    onClose,
    load,
    select,
    useAgentPresetSeat: bindSnapshotSelector(store),
    t,
  } as unknown as AgentPresetPlusMenuProps
  return { view: render(<AgentPresetPlusMenu {...props} />), load, select, onClose, store }
}

describe('AgentPresetPlusMenu', () => {
  it('loads the roster and prefers the four built-in modes', () => {
    const { load } = setup({ options: BUILT_IN, current: 'code' })
    expect(load).toHaveBeenCalledOnce()
    const items = screen.getAllByRole('menuitem')
    expect(items.map(item => item.textContent)).toEqual(['标准模式', 'PTC 模式', '极简模式', '创造模式'])
    expect(items[1]!.getAttribute('aria-current')).toBe('true')
    expect(items[0]!.getAttribute('aria-current')).toBeNull()
  })

  it('falls back to the first four roster rows when the built-ins are absent', () => {
    setup({
      options: [
        { id: 'alpha', trust: 'user', name: 'Alpha' },
        { id: 'beta', trust: 'user' },
        { id: 'gamma', trust: 'user', name: 'Gamma' },
        { id: 'delta', trust: 'user', name: 'Delta' },
        { id: 'extra', trust: 'user', name: 'Extra' },
      ],
    })
    expect(screen.getAllByRole('menuitem').map(item => item.textContent))
      .toEqual(['Alpha', 'beta', 'Gamma', 'Delta'])
  })

  it('renders an empty group while the roster has no options', () => {
    const { view } = setup()
    expect(screen.queryByRole('menuitem')).toBeNull()
    expect(view.container.querySelectorAll('button')).toHaveLength(0)
  })

  it('selects a mode, closes the menu, and stays disabled while busy', async () => {
    const select = vi.fn(() => Promise.resolve())
    const { onClose } = setup({ options: BUILT_IN, current: 'standard' }, select)
    fireEvent.click(screen.getByRole('menuitem', { name: '极简模式' }))
    await waitFor(() => { expect(select).toHaveBeenCalledWith('minimal') })
    expect(onClose).toHaveBeenCalledOnce()
    cleanup()
    setup({ options: BUILT_IN, busy: true })
    expect((screen.getByRole('menuitem', { name: '标准模式' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
