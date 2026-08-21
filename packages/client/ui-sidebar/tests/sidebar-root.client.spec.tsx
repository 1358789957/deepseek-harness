// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type {
  SidebarFooterActionOwnerProps, SidebarNavOwnerProps, SidebarRootComponentProps,
  SidebarSectionOwnerProps, SidebarSettingsOwnerProps,
} from '../src/client/contract/slots.ts'
import { SidebarRoot } from '../src/client/SidebarRoot.tsx'
import { en } from '../src/client/locales.ts'

// English-dictionary translate stub: the shell renders the same copy the
// assertions below query by accessible name.
const t: SidebarRootComponentProps['t'] = key => (en as Record<string, string>)[key] ?? key

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// The shell never reads the global hooks itself, but they ride the standard
// props share; stub them as never-called functions.
const neverHook = (() => { throw new Error('shell must not read global hooks') }) as never

function mountShell({
  collapsed = false, width = 300, page = 'home',
}: { collapsed?: boolean; width?: number; page?: string } = {}) {
  const startSession = vi.fn()
  const toggleSidebar = vi.fn()
  let regionOwner: SidebarSectionOwnerProps | undefined
  let settingsOwner: SidebarSettingsOwnerProps | undefined
  let footerActionOwner: SidebarFooterActionOwnerProps | undefined
  let navOwner: SidebarNavOwnerProps | undefined
  let current = { collapsed, width, page }
  const root = () => (
    <SidebarRoot
      collapsed={current.collapsed} width={current.width} page={current.page}
      useSessions={neverHook} useWorkspaces={neverHook}
      startSession={startSession} toggleSidebar={toggleSidebar} t={t}
      renderSlot={((
        key: string,
        owner: SidebarFooterActionOwnerProps | SidebarNavOwnerProps
          | SidebarSectionOwnerProps | SidebarSettingsOwnerProps,
      ) => {
        if (key === 'sidebar.settings') {
          settingsOwner = owner
          return <div data-testid="settings-seat" data-wide={owner.wide} />
        }
        if (key === 'sidebar.footer.action') {
          footerActionOwner = owner
          return <div data-testid="footer-action-seat" data-wide={owner.wide} />
        }
        if (key === 'sidebar.nav') {
          navOwner = owner as SidebarNavOwnerProps
          return <div data-testid="nav-seat" data-wide={owner.wide} data-page={(owner as SidebarNavOwnerProps).page} />
        }
        regionOwner = owner as SidebarSectionOwnerProps
        return <div data-testid="region" data-wide={owner.wide} />
      }) as SidebarRootComponentProps['renderSlot']}
    />
  )
  const view = render(root())
  return {
    startSession,
    toggleSidebar,
    regionOwner: () => {
      if (regionOwner === undefined) throw new Error('region owner not rendered')
      return regionOwner
    },
    settingsOwner: () => {
      if (settingsOwner === undefined) throw new Error('settings owner not rendered')
      return settingsOwner
    },
    footerActionOwner: () => {
      if (footerActionOwner === undefined) throw new Error('footer action owner not rendered')
      return footerActionOwner
    },
    navOwner: () => navOwner,
    rerender(next: Partial<typeof current>) {
      current = { ...current, ...next }
      view.rerender(root())
    },
  }
}

describe('SidebarRoot shell', () => {
  it('routes New Session (capsule + wordmark) and the column toggle', () => {
    const b = mountShell()
    // Expanded, both the wordmark and the capsule start a session.
    const starters = screen.getAllByRole('button', { name: 'New session' })
    expect(starters).toHaveLength(2)
    for (const button of starters) fireEvent.click(button)
    expect(b.startSession).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(b.toggleSidebar).toHaveBeenCalledOnce()
  })

  it('hands the region its wide flag and clamps expandSidebar to the collapsed state', () => {
    const b = mountShell()
    expect(b.regionOwner().wide).toBe(true)
    // The settings seat rides the same wide flag (ui-settings renders the row).
    expect(b.settingsOwner().wide).toBe(true)
    expect(b.footerActionOwner().wide).toBe(true)
    expect(b.navOwner()?.wide).toBe(true)
    expect(b.navOwner()?.page).toBe('home')
    expect(screen.getByTestId('nav-seat')).toBeTruthy()
    // Expanded: the request is a no-op (no accidental collapse).
    b.regionOwner().expandSidebar()
    expect(b.toggleSidebar).not.toHaveBeenCalled()
  })

  it('keeps the region mounted through collapse and expands on its request', () => {
    vi.useFakeTimers()
    const b = mountShell()
    b.rerender({ collapsed: true })
    // Wide content survives the crossfade window, then settles into the rail.
    expect(b.regionOwner().wide).toBe(true)
    vi.advanceTimersByTime(200)
    b.rerender({})
    expect(b.regionOwner().wide).toBe(false)
    expect(b.footerActionOwner().wide).toBe(false)
    expect(b.navOwner()).toBeUndefined()
    expect(screen.queryByTestId('nav-seat')).toBeNull()
    expect(screen.getByTestId('region')).toBeTruthy()
    b.regionOwner().expandSidebar()
    expect(b.toggleSidebar).toHaveBeenCalledOnce()
  })

  it('toggles the sidebar on Ctrl/Meta+B unless an editor is focused', () => {
    const b = mountShell()
    fireEvent.keyDown(document, { code: 'KeyB', ctrlKey: true })
    expect(b.toggleSidebar).toHaveBeenCalledOnce()
    fireEvent.keyDown(document, { code: 'KeyB', metaKey: true })
    expect(b.toggleSidebar).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(document, { code: 'KeyB', ctrlKey: true, altKey: true })
    fireEvent.keyDown(document, { code: 'KeyB' })
    fireEvent.keyDown(document, { code: 'KeyK', ctrlKey: true })
    expect(b.toggleSidebar).toHaveBeenCalledTimes(2)

    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { code: 'KeyB', ctrlKey: true })
    expect(b.toggleSidebar).toHaveBeenCalledTimes(2)
    input.remove()

    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    fireEvent.keyDown(textarea, { code: 'KeyB', metaKey: true })
    expect(b.toggleSidebar).toHaveBeenCalledTimes(2)
    textarea.remove()

    const select = document.createElement('select')
    document.body.appendChild(select)
    fireEvent.keyDown(select, { code: 'KeyB', ctrlKey: true })
    expect(b.toggleSidebar).toHaveBeenCalledTimes(2)
    select.remove()

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.appendChild(editable)
    fireEvent.keyDown(editable, { code: 'KeyB', ctrlKey: true })
    expect(b.toggleSidebar).toHaveBeenCalledTimes(2)
    editable.remove()
  })

  it('renders statically collapsed on a cold start (no crossfade classes)', () => {
    const b = mountShell({ collapsed: true })
    expect(b.regionOwner().wide).toBe(false)
    expect(screen.getByRole('button', { name: 'Open sidebar' })).toBeTruthy()
  })
})
