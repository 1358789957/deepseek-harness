# Agent Note: Conversation jump rail stays inside ui-conversation

Status: implemented

English | [中文](2026-08-16-conversation-jump-rail.zh.md)

## Problem

Long Chat transcripts force linear scrolling. Codex solve this with a left-gutter rail: hover a nearby turn to preview it, click to jump. DeepSeek Harness Chat had the scrollport and stable row identities but no equivalent scrubber, so a reader hunting an earlier prompt had to wheel the whole window.

A tempting fix is a new `root` or `conversation.view` plugin that overlays the column. That would steal chrome from ChatView, require a root registration this package does not own, and duplicate the scrollport contract ConversationRoot already reserved.

## Decision

The jump rail is ChatView chrome in `@deepseek-ai/dsh-client-ui-conversation`. It is not registered on `root` and is not a `conversation.view` tab.

`collectMapMessages` reads the loaded Chat order and keeps `user` plus non-empty `assistant-step` rows. ChatView collects those messages in its snapshot selector and compares their ids, roles, and bodies, so streamed assistant text refreshes the preview even when the mutable Chat Node store retains its identity. `buildTurns` groups each user message with the assistant replies that follow it; while the session runs, the latest turn stays `running` even after it has emitted summary text. The rail renders only when two or more user turns are loaded. Each tick is a button: hover (after 300ms, or immediately once a preview is open) shows that turn's title, status, and up to two assistant summary lines; click or keyboard activation calls `jumpToMessage` on the resolved conversation scrollport (`[data-conversation-scroll]` when nested, otherwise the view-local scroller). `ChatNodeSeat` stamps `data-conversation-message` with the Node key so the jumper does not interpolate a selector.

The rail is a zero-size sticky overlay on the left of the Chat scroller so the conversation scrollbar stays on the right. Markers retain a 14px natural gap while it fits and compress uniformly into the measured rail when a long transcript would overflow it. Below 720px the host hides; a narrow column would collide with the transcript. A successful manual jump clears ChatView's bottom-follow pin through `onManualNavigate`.

## Alternatives considered

**Register a root overlay plugin.** A root occupant would sit outside ChatView's scroll math, need a new slot declaration on the shell, and could not see the Chat Node store without a second subscription path. The rail is a chat-flow control; ChatView already owns the order, the scrollport, and the follow pin.

**Add a `conversation.view` tab.** A map tab would replace the transcript instead of scrubbing it. Codex keep the rail beside the same thread the reader is in.

**One marker per Chat Node, including tools.** Tool and chrome rows are not turns. A marker per user prompt matches how readers look for "the question I asked".

**Always-visible preview list.** A persistent card competes with the transcript. The hover/focus card is enough to choose a jump.

## Testing

- `packages/client/ui-conversation/tests/conversation-map.client.spec.ts` pins collection, turn grouping, preview compaction, and marker/jump math.
- `packages/client/ui-conversation/tests/conversation-map-view.client.spec.tsx` pins the gutter, delayed hover preview, click jump, keyboard ticks, missing anchors, and reduced-motion scrolling.

## Consequences

- Short threads (zero or one user turn) show no rail.
- Only the loaded window is jumpable; older history still requires `chat.loadOlder`.
- Steering bubbles are not markers; they stay mid-turn flow rows.
- Long loaded windows compress marker spacing rather than drawing ticks below the transcript viewport.
- The rail adds left-edge hit targets; the 720px cutoff keeps them off narrow columns.
