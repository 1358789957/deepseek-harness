/**
 * Session-wide file-change facts for the Review pane. Paths and +/- counts
 * come from snapshot DiffBlock hunks (and deliverables locations). Nothing
 * here invents git stats or commit SHAs.
 */
import type {
  ChatConversationViewNode, ConversationSnapshot, ToolCallBlock,
} from '@deepseek-ai/dsh-client-runtime/client'

/** One changed path; counts are present only when real hunks were counted. */
export interface ReviewFile {
  readonly path: string
  readonly added?: number
  readonly removed?: number
}

/** Aggregated Review "变更" / "本轮产出" material. */
export interface ReviewChanges {
  readonly files: readonly ReviewFile[]
  readonly added: number | null
  readonly removed: number | null
  readonly produced: readonly string[]
}

interface FileAccum {
  added: number
  removed: number
  counted: boolean
}

interface DiffHunk {
  path: string
  oldText: string | null
  newText: string
}

interface DeliverablesTurnData {
  readonly produced: readonly { readonly path: string }[]
}

/** Same terminator rule DiffBlock uses so Review counts match the cards. */
function contentLines(text: string): string[] {
  if (text === '') return []
  const body = text.endsWith('\n') ? text.slice(0, -1) : text
  return body.split('\n')
}

function narrowHunks(diffs: unknown): DiffHunk[] | null {
  if (!Array.isArray(diffs) || diffs.length === 0) return null
  const out: DiffHunk[] = []
  for (const hunk of diffs) {
    if (typeof hunk !== 'object' || hunk === null) return null
    const { path, oldText, newText } = hunk as Record<string, unknown>
    if (typeof path !== 'string') return null
    if (oldText !== null && typeof oldText !== 'string') return null
    if (typeof newText !== 'string') return null
    out.push({ path, oldText, newText })
  }
  return out
}

function addHunk(into: Map<string, FileAccum>, hunk: DiffHunk): void {
  const added = contentLines(hunk.newText).length
  const removed = hunk.oldText === null ? 0 : contentLines(hunk.oldText).length
  const prev = into.get(hunk.path)
  if (prev === undefined) {
    into.set(hunk.path, { added, removed, counted: true })
    return
  }
  if (prev.counted) {
    prev.added += added
    prev.removed += removed
    return
  }
  prev.added = added
  prev.removed = removed
  prev.counted = true
}

function addPathOnly(into: Map<string, FileAccum>, path: string): void {
  if (!into.has(path)) into.set(path, { added: 0, removed: 0, counted: false })
}

function locationsOf(view: object): readonly string[] {
  const locations = (view as { locations?: unknown }).locations
  if (!Array.isArray(locations)) return []
  const paths: string[] = []
  for (const location of locations) {
    if (typeof location !== 'object' || location === null) continue
    const path = (location as { path?: unknown }).path
    if (typeof path === 'string') paths.push(path)
  }
  return paths
}

function viewOf(block: ToolCallBlock): object | null {
  if ('kind' in block) {
    if (block.isError) return null
    const view = block.resultView ?? block.callView
    return typeof view === 'object' && view !== null ? view : null
  }
  return typeof block.callView === 'object' && block.callView !== null ? block.callView : null
}

function visitBlock(block: ToolCallBlock, into: Map<string, FileAccum>): void {
  const view = viewOf(block)
  if (view !== null) {
    const card = (view as { card?: unknown }).card
    if (card === 'diff') {
      const hunks = narrowHunks((view as { diffs?: unknown }).diffs)
      if (hunks !== null) {
        for (const hunk of hunks) addHunk(into, hunk)
      } else {
        for (const path of locationsOf(view)) addPathOnly(into, path)
      }
    } else if (card === 'generic' && (view as { kind?: unknown }).kind === 'edit') {
      for (const path of locationsOf(view)) addPathOnly(into, path)
    }
  }
  for (const child of block.subCalls) visitBlock(child, into)
}

function toolRoot(node: ChatConversationViewNode): ToolCallBlock | undefined {
  if (node.kind !== 'tool-call') return undefined
  const root = (node.data as { root?: ToolCallBlock }).root
  return root
}

function producedFromTimeline(snapshot: ConversationSnapshot): string[] {
  const paths: string[] = []
  const seen = new Set<string>()
  for (const turn of snapshot.chat.timeline.turns.values()) {
    const data = (turn.data as { get(key: string): unknown }).get('deliverables') as
      | DeliverablesTurnData
      | undefined
    if (data?.produced === undefined) continue
    for (const item of data.produced) {
      if (seen.has(item.path)) continue
      seen.add(item.path)
      paths.push(item.path)
    }
  }
  return paths
}

/**
 * Collect changed files and produced paths from the live conversation snapshot.
 * @param snapshot - current session conversation snapshot.
 * @returns first-seen files, optional aggregate +/- from real hunks, and deliverables.
 */
export function reviewChanges(snapshot: ConversationSnapshot): ReviewChanges {
  const into = new Map<string, FileAccum>()
  for (const node of snapshot.chat.nodes.values()) {
    const root = toolRoot(node)
    if (root !== undefined) visitBlock(root, into)
  }
  const produced = producedFromTimeline(snapshot)
  for (const path of produced) addPathOnly(into, path)

  const files: ReviewFile[] = []
  let added = 0
  let removed = 0
  let anyCounted = false
  for (const [path, stats] of into) {
    if (stats.counted) {
      files.push({ path, added: stats.added, removed: stats.removed })
      added += stats.added
      removed += stats.removed
      anyCounted = true
    } else {
      files.push({ path })
    }
  }
  return {
    files,
    added: anyCounted ? added : null,
    removed: anyCounted ? removed : null,
    produced,
  }
}

/**
 * Structural equality for {@link reviewChanges} so useSession can skip frames.
 * @param left - previous material.
 * @param right - next material.
 * @returns whether both sides name the same files, counts, and produced paths.
 */
export function sameReviewChanges(left: ReviewChanges, right: ReviewChanges): boolean {
  return left.added === right.added
    && left.removed === right.removed
    && left.files.length === right.files.length
    && left.produced.length === right.produced.length
    && left.files.every((file, index) => {
      const other = right.files[index]
      return other !== undefined
        && file.path === other.path
        && file.added === other.added
        && file.removed === other.removed
    })
    && left.produced.every((path, index) => path === right.produced[index])
}

/**
 * Trailing path segment for a compact file row.
 * @param path - slash- or backslash-separated path.
 * @returns the final segment, or the whole string when separator-free.
 */
export function reviewBasename(path: string): string {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at === -1 ? path : path.slice(at + 1)
}
