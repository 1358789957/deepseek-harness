// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { PluginsNavTrigger, type PluginsNavTriggerProps } from '../src/client/PluginsNavTrigger.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const t: PluginsNavTriggerProps['t'] = makeTranslate(zh)

describe('PluginsNavTrigger', () => {
  it('renders nothing on the compact rail', () => {
    const { container } = render(<PluginsNavTrigger {...{
      wide: false, t, openPlugins: vi.fn(),
    } as unknown as PluginsNavTriggerProps} />)
    expect(container.innerHTML).toBe('')
  })

  it('opens Settings on the Plugins section', () => {
    const openPlugins = vi.fn()
    render(<PluginsNavTrigger {...{
      wide: true, t, openPlugins,
    } as unknown as PluginsNavTriggerProps} />)
    fireEvent.click(screen.getByRole('button', { name: '插件' }))
    expect(openPlugins).toHaveBeenCalledOnce()
  })
})
