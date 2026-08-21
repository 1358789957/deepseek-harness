# Agent Note: Codex-aligned empty hero, settings search, and list chrome

Status: implemented

English | [中文](2026-08-16-codex-shell-chrome.zh.md)

## Problem

The conversation column, Review rail, and session rows already follow Codex desktop density. The empty hero, Settings modal, sidebar section header, and Plugin list still read as a different product: a poetic headline, an unsearchable settings nav, a generic Sessions label on a recency list, and a two-column plugin card grid. Those pages are the ones a Codex screenshot shows first.

A tempting match is to copy ChatGPT consumer chrome — an upgrade banner, a plugin marketplace with Install, or a Local / Worktree / Cloud switcher. None of those facts exist in this product.

## Decision

The empty hero headline is the localized question `What should we build?` / `我们要构建什么？`. The [Preview badge](2026-08-05-web-preview-product-badge.md) stays on the same row until the first tagged release removes it. The composer placeholder stays product-owned (`Describe what you want to build`); it is not rebranded to Codex.

Settings nav search is a shell viewing filter over projected `settings.section` labels. Copy arrives through `settings.search` and `settings.searchEmpty`. A non-empty query that matches nothing renders the empty seat and no section. Escape clears a non-empty query before it closes the panel. The General section renders its nav label as the page heading, matching the other settings pages.

The sidebar header is **Recent** only for the flat list while Last updated is selected. Workspace grouping keeps **Workspaces**. Flat + Manual keeps **Sessions**. The tree accessible name stays Sessions because the rows are still sessions.

The Plugin list is a single-column disclosure list: short module name, full module specifier, enablement tag, and the existing fiber-status dot. It remains a read-only Host inventory. There is no Install control and no connector store.

Ctrl/Cmd+, toggles the Settings panel. The wide sidebar trigger shows that shortcut as trailing text hidden from assistive technology so the accessible name stays the Settings seat copy. The product has no account, billing quota, invite, pet, or logout, so the foot stays a Settings control rather than a fake profile menu.

## Alternatives considered

**Drop the Preview badge to match the Codex empty page.** Rejected. Preview status is a product-wide identity, not decoration; the owning note forbids a runtime hide.

**Rebrand the composer to "Message Codex" and add a Plus upgrade row.** Rejected. Those strings name another product and a commerce offer this deployment does not have.

**Search General row titles from the shell.** Rejected. Item labels are not on the section ledger; the shell would have to invent a second projection into feature-owned rows.

**Default the sidebar to a flat Recent list.** Rejected. Workspace grouping is the Host fact; Recent is a label on the existing flat + last-updated mode, not a second session list.

**Add Install buttons or an installed-icon strip.** Rejected. The inventory cannot enable, disable, or fetch marketplace plugins.

**Replace the Settings trigger with an account menu (usage left, Show pet, Invite a friend, Log out).** Rejected. There is no signed-in profile, billing remaining-percent, invite flow, or logout. A one-item Settings menu would add a click without adding a fact.

## Consequences

- Assembled hero snapshots and keyless e2e strings follow the new headline.
- Settings search does not look inside a section. A query that hides the active section falls back to the first remaining row.
- Recent is a header label, not a pinned or recency account of its own.
- Plugin rows show the real module specifier instead of a marketing description.
- Ctrl/Cmd+, is ignored while an input, textarea, select, or contenteditable is focused.

## Testing

- `packages/client/ui-conversation/tests/skeleton.client.spec.tsx` pins both localized headlines and the Preview badge.
- `packages/client/ui-settings-general/tests/settings-root.client.spec.tsx` and `components.client.spec.tsx` pin nav filter, empty copy, Escape-clears-query, the General heading, the wide shortcut hint, and Ctrl/Cmd+, toggle.
- `packages/client/ui-workspace/tests/workspace-browser.client.spec.tsx` pins Recent on flat + last-updated and Sessions on flat + Manual.
- `packages/client/ui-settings-plugin-inventory/tests/components.client.spec.tsx` pins the visible module specifier on a list row.
- `apps/web/tests/snapshots/lifecycle-chrome/hero.expected.md` and `plan-active.expected.md` pin the assembled English hero.

## Related

- [Web preview product badge](2026-08-05-web-preview-product-badge.md) still owns the badge that remains beside the new headline.
- [Conversation jump rail](2026-08-16-conversation-jump-rail.md) and [Codex Review column](2026-08-16-codex-review-column.md) own the already-shipped transcript chrome; this note does not change them.
- [Codex sidebar task board, scheduled jobs, and plus menu](2026-08-21-codex-sidebar-jobs-and-plus-menu.md) owns the plus-menu rows and sidebar page triggers; this note still owns hero copy, settings search, and plugin inventory chrome.
