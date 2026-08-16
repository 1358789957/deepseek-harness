// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import {
  createSnapshotStore, EMPTY_CHAT_SNAPSHOT, EMPTY_CONVERSATION_VIEWS,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {
  ConversationSnapshot, SessionId, SessionListState, ToolResultNode, WorkspaceListState,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionProviderComponent } from '@deepseek-ai/dsh-client-ui-slots'
import type { DetailsSlotProps, DetailsToolOwnerProps, SelectionTarget } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import type { TodoItem } from '@deepseek-ai/dsh-tool-todo/client'
import { createChatStore } from '../src/client/stores.ts'
import { DetailsPanel } from '../src/client/skeleton/DetailsPanel.tsx'
import { ReviewPane } from '../src/client/skeleton/ReviewPane.tsx'
import { ReviewHeaderAction } from '../src/client/skeleton/ReviewHeaderAction.tsx'
import { zh } from '../src/client/locales.ts'
import { chatSnapshotFixture } from './chat-snapshot-fixture.client.ts'

const t = makeTranslate(zh, commonZh)
const SID = 's1' as SessionId
const SessionProviderStub: SessionProviderComponent = ({ children }) => children(SID)

afterEach(cleanup)

const TODOS: readonly TodoItem[] = [
  { content: '搭骨架', status: 'completed' },
  { content: '写组件', status: 'in_progress' },
  { content: '补测试', status: 'pending' },
]

function renderToolDetailsProbe(owners?: DetailsToolOwnerProps[]): DetailsSlotProps['renderSlot'] {
  return (_key, owner) => {
    owners?.push(owner as unknown as DetailsToolOwnerProps)
    return <div data-testid="tool-details-seat" />
  }
}

function snapshotBase(over: Partial<ConversationSnapshot> = {}): ConversationSnapshot {
  const nodes = over.nodes ?? []
  const runningCalls = over.runningCalls ?? []
  return {
    sessionId: SID, views: EMPTY_CONVERSATION_VIEWS,
    chat: over.chat ?? (nodes.length === 0 && runningCalls.length === 0
      ? EMPTY_CHAT_SNAPSHOT
      : chatSnapshotFixture({ nodes, runningCalls })),
    nodes, turnTimings: new Map(), turnEnds: new Map(), partial: null, runningCalls,
    pending: [], queue: [], running: false, composerPhase: 'active', removed: false,
    openState: 'open', openError: null, hasMore: false, loadingOlder: false,
    promptError: null, blank: false, subagent: null, lastAgentError: null, ...over,
  }
}

function mountDetails(opts?: {
  snap?: ConversationSnapshot
  selection?: SelectionTarget | null
  todos?: readonly TodoItem[] | null
  owners?: DetailsToolOwnerProps[]
  closeDetails?: () => void
  openFile?: (path: string) => void
}) {
  const snap = opts?.snap ?? snapshotBase()
  const chat = createChatStore().create()
  if (opts?.selection) chat.actions.select(opts.selection)
  const emptyList = createSnapshotStore<SessionListState>(
    { ids: [], byId: {}, current: undefined, phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined })
  const emptyWorkspaces = createSnapshotStore<WorkspaceListState>({
    items: [], archivedSessionIds: [], state: 'idle', phase: 'ready', error: null,
    baselinesReady: true, recentWorkspaceId: undefined,
  })
  const todos = opts?.todos
  return render(
    <DetailsPanel
      SessionProvider={SessionProviderStub}
      renderSlot={renderToolDetailsProbe(opts?.owners)}
      sessionId={SID}
      useSession={bindSnapshotSelector({ getSnapshot: () => snap, subscribe: () => () => {} })}
      useSessions={bindSnapshotSelector(emptyList)}
      useWorkspaces={bindSnapshotSelector(emptyWorkspaces)}
      useProjection={(key: string) => key === 'todos' ? todos : undefined}
      useInput={(() => { throw new Error('unused') })}
      inputActions={{
        setDraft: () => {},
        addImages: () => true,
        removeImage: () => {},
        pruneImages: () => {},
        submit: () => {},
      }}
      useStore={bindSnapshotSelector(chat)}
      actions={chat.actions}
      closeDetails={opts?.closeDetails ?? vi.fn()}
      openFile={opts?.openFile ?? vi.fn()}
      t={t}
    />,
  )
}

describe('ReviewPane', () => {
  it('shows the standing sections with honest empty copy', () => {
    const view = render(
      <ReviewPane files={[]} added={null} removed={null} produced={[]} todos={[]} t={t} openFile={vi.fn()} />,
    )
    expect(view.getByText('变更')).toBeTruthy()
    expect(view.getByText('暂无文件变更')).toBeTruthy()
    expect(view.getByText('任务')).toBeTruthy()
    expect(view.getByText('暂无任务')).toBeTruthy()
    expect(view.queryByText('本轮产出')).toBeNull()
    expect(view.container.querySelector('[data-review-section="produced"]')).toBeNull()
  })

  it('lists files with real +/- and exposes produced paths as a section', () => {
    const view = render(
      <ReviewPane
        files={[{ path: 'src/a.ts', added: 4, removed: 1 }, { path: 'notes/b.md' }]}
        added={4}
        removed={1}
        produced={['src/a.ts']}
        todos={TODOS}
        t={t}
        openFile={vi.fn()}
      />,
    )
    expect(view.getAllByText('a.ts').length).toBeGreaterThan(0)
    expect(view.getAllByText('+4').length).toBeGreaterThan(0)
    expect(view.getAllByText('−1').length).toBeGreaterThan(0)
    expect(view.getByText('b.md')).toBeTruthy()
    expect(view.getByText('本轮产出')).toBeTruthy()
    expect(view.container.querySelector('[data-review-produced="src/a.ts"]')).not.toBeNull()
    expect(view.getByText('搭骨架')).toBeTruthy()
    expect(view.container.querySelectorAll('[data-review-todo]')).toHaveLength(3)
    expect(view.container.querySelector('[data-review-todo="completed"]')?.textContent).toBe('已完成: 搭骨架')
  })
})

describe('DetailsPanel Review host', () => {
  it('always titles the column 审查 and keeps Changes and Tasks when empty', () => {
    const view = mountDetails()
    expect(view.getByText('审查')).toBeTruthy()
    expect(view.container.querySelector('[data-review-section="changes"]')).not.toBeNull()
    expect(view.container.querySelector('[data-review-section="tasks"]')).not.toBeNull()
    expect(view.container.querySelector('[data-review-section="produced"]')).toBeNull()
    expect(view.container.querySelector('[data-review-section="details"]')).toBeNull()
    expect(view.getByText('暂无文件变更')).toBeTruthy()
    expect(view.getByText('暂无任务')).toBeTruthy()
  })

  it('renders hunk counts, todos, and a fourth 详情 when a tool is selected', () => {
    const node: ToolResultNode = {
      kind: 'tool-result', seq: 10, time: 2_000, callId: 'c1',
      call: { name: 'edit', argsRaw: '{"path":"a.ts"}' },
      callTime: 1_000,
      content: [{ type: 'text', text: 'ok' }], isError: false,
      callView: null,
      resultView: { card: 'diff', title: 'Edit src/a.ts', diffs: [{ path: 'src/a.ts', oldText: 'x\n', newText: 'y\nz\n' }] },
      subCalls: [],
    }
    const owners: DetailsToolOwnerProps[] = []
    const view = mountDetails({
      snap: snapshotBase({ nodes: [node] }),
      selection: { turnSeq: 10, callId: 'c1', toolName: 'edit' },
      todos: TODOS,
      owners,
    })
    expect(view.getByText('a.ts')).toBeTruthy()
    expect(view.getAllByText('+2').length).toBeGreaterThan(0)
    expect(view.getAllByText('−1').length).toBeGreaterThan(0)
    expect(view.getByText('写组件')).toBeTruthy()
    expect(view.getByText('edit')).toBeTruthy()
    expect(view.getByTestId('tool-details-seat')).toBeTruthy()
    expect(owners).toHaveLength(1)
  })
})

describe('ReviewPane file open and Escape', () => {
  it('opens a listed change or produced path and does not invent commit facts', () => {
    const openFile = vi.fn()
    const view = render(
      <ReviewPane
        files={[{ path: 'src/a.ts', added: 4, removed: 1 }, { path: 'notes/b.md' }]}
        added={4}
        removed={1}
        produced={['src/a.ts']}
        todos={[]}
        t={t}
        openFile={openFile}
      />,
    )
    fireEvent.click(view.container.querySelector('[data-review-file="src/a.ts"]')!)
    expect(openFile).toHaveBeenCalledWith('src/a.ts')
    fireEvent.click(view.getByText('b.md'))
    expect(openFile).toHaveBeenCalledWith('notes/b.md')
    fireEvent.click(view.container.querySelector('[data-review-produced="src/a.ts"]')!)
    expect(openFile).toHaveBeenCalledTimes(3)
    expect(openFile).toHaveBeenNthCalledWith(3, 'src/a.ts')
    expect(view.queryByText(/commit|sha|hash/i)).toBeNull()
  })

  it('closes the details column on Escape unless typing or an overlay is open', () => {
    const closeDetails = vi.fn()
    const view = mountDetails({ closeDetails })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(closeDetails).toHaveBeenCalledTimes(1)

    const input = document.createElement('input')
    view.container.appendChild(input)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(closeDetails).toHaveBeenCalledTimes(1)

    const textarea = document.createElement('textarea')
    view.container.appendChild(textarea)
    fireEvent.keyDown(textarea, { key: 'Escape' })
    expect(closeDetails).toHaveBeenCalledTimes(1)

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    view.container.appendChild(editable)
    fireEvent.keyDown(editable, { key: 'Escape' })
    expect(closeDetails).toHaveBeenCalledTimes(1)

    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    document.body.appendChild(menu)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(closeDetails).toHaveBeenCalledTimes(1)
    menu.remove()

    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.appendChild(dialog)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(closeDetails).toHaveBeenCalledTimes(1)
    dialog.remove()

    const modal = document.createElement('div')
    modal.setAttribute('aria-modal', 'true')
    document.body.appendChild(modal)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(closeDetails).toHaveBeenCalledTimes(1)
    modal.remove()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(closeDetails).toHaveBeenCalledTimes(2)
  })
})

describe('ReviewHeaderAction', () => {
  it('toggles from the button or Codex shortcut and reflects the open bit', () => {
    const toggleDetails = vi.fn()
    const store = createSnapshotStore({ open: false })
    const view = render(
      <ReviewHeaderAction
        {...{
          useDetailsOpen: bindSnapshotSelector(store),
          toggleDetails,
          t,
        } as Parameters<typeof ReviewHeaderAction>[0]}
      />,
    )
    const button = view.getByRole('button', { name: '打开审查' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(button)
    expect(toggleDetails).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document, { code: 'KeyB', ctrlKey: true, altKey: true })
    fireEvent.keyDown(document, { code: 'KeyB', metaKey: true, altKey: true })
    expect(toggleDetails).toHaveBeenCalledTimes(3)

    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { code: 'KeyB', ctrlKey: true, altKey: true })
    expect(toggleDetails).toHaveBeenCalledTimes(3)
    input.remove()
  })
})
