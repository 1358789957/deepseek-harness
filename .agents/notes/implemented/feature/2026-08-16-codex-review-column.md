# Agent Note: Review column is session-window chrome, not Git

Status: implemented

English | [中文](2026-08-16-codex-review-column.zh.md)

## Problem

Codex keeps a right-hand Review column: Changes, produced artifacts, and Tasks for the current thread, opened from a header control or Cmd/Ctrl+Alt+B. DeepSeek Harness already had a details track for a selected Tool call. Filling that track with invented Git staged/unstaged, commits, or inline comment review would promise repository facts the session does not own.

A second failure is open-state ownership. The layout store's details width is a preference: concession and a blank Session can render the column at zero while the preference stays open. A conversation-local mirror of "the user asked to open Review" then leaves the header pressed, Escape armed, and `openDetails` a no-op against a column the reader cannot see.

## Decision

Review occupies the layout `details` slot as DetailsPanel chrome in `@deepseek-ai/dsh-client-ui-conversation`. Changes, produced-only paths, and Tasks fold the loaded conversation snapshot and the current `todos` projection. There is no Git backend, staged/unstaged selector, commit list, or inline review.

The header Review utility and Cmd/Ctrl+Alt+B toggle `ctx.layout` open/close. AppFrame publishes the rendered column on the details owner share (`open`, `available`) and stamps `data-app-frame` / `data-details-available`. The header pressed state follows that rendered `open` bit. The control and shortcut stay inert when `available` is false. Escape listens only while `open` is true.

Opening Review from the header or shortcut writes `selection` to `null` so a leftover Tool Input/Output section does not return. Clicking a Tool row still selects that call and opens the column.

The jump rail stays ChatView chrome; see [Conversation jump rail](2026-08-16-conversation-jump-rail.md).

## Alternatives considered

**Git-backed Review (staged/unstaged, commit, push, inline comments).** The session window does not own the working tree. Invented SHAs or hunks would lie. Repository review stays a later capability with its own store.

**A conversation-local open bit that only tracks layout actions.** Session switch and concession change the rendered width without calling the conversation close callback, so the header and Escape desync. AppFrame already solves columns; it publishes the rendered bits.

**A `conversation.view` Review tab.** Codex keeps Review beside the same thread. A tab would replace the transcript.

**Keep the last Tool selection when opening from the header.** Codex Review is Changes and Tasks. Resurrecting Input/Output from a prior tool click makes the column look like a stale inspector.

## Testing

- `packages/client/ui-layout/tests/columns.client.spec.ts` pins `detailsTrackFits` to the concession floor.
- `packages/client/ui-layout/tests/app-frame.client.spec.tsx` pins details owner props and `data-details-available`.
- `packages/client/ui-conversation/tests/review-pane.client.spec.tsx` pins Escape-while-open, column-open mirroring, and the shortcut when the frame cannot allocate the track.
- `packages/client/ui-conversation/tests/apply-inject.client.spec.tsx` pins header toggle, selection clear, and `setColumnOpen`.
- `apps/web/tests/produced-file-mentions.e2e.ts` pins the assembled Review column.

## Consequences

- Review lists only the loaded window; older history still requires `chat.loadOlder`, and edits outside the session never appear.
- Widening a conceded window restores the layout preference; the header follows the rendered width again.
- Blank Sessions and viewports that cannot fit `DETAILS_MIN` hide Review rather than showing a pressed control over an empty track.
