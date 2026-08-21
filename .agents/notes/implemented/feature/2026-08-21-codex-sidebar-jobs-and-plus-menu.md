# Agent Note: Codex sidebar task board, scheduled jobs, and plus menu

Status: implemented

English | [中文](2026-08-21-codex-sidebar-jobs-and-plus-menu.zh.md)

## Problem

The Codex-aligned shell already had a wide sidebar and a composer plus control, but three human entry points were missing or in the wrong place.

Official DSH 后台任务 (running `ctx.jobs` work for the current session) already has a session-header popover. This fork's approved chrome puts that list in the sidebar as **任务看板**, after 新会话 and 插件, replacing the center column instead of opening a top-bar sheet.

**定时任务** is a different product fact: a user-authored name plus cadence. The host `schedule_*` tools are session-scoped and model-facing; there is no user RPC and no client UI. Putting cron next to the plus menu, or seeding sample jobs, would mix two features and leak private workspace names.

The plus control still opened the slash Command menu, so Plan, the four agent modes, Skill, and API 密钥 had no always-visible composer home. Skill must open a full page, not Settings → Plugins. The API key must be inputtable, write-only, and never echoed.

Preview and fixtures must not contain the user's project 「声场」, 跳转轨 chats, or other real workspace names.

## Decision

`sidebar.nav` is a wide-only list between New Session and `sidebar.workspaces`. Occupants: 插件 (`order: 0`, opens Settings on the Plugins section and returns the center column to `'home'`), 任务看板 (`order: 10`), 定时任务 (`order: 20`). The compact rail renders no distinct icons for these rows.

`ctx.layout.showPage(page)` writes the layout store's `page`. `'home'` shows the conversation; any other id must match a `shell.page` registration. AppFrame overlays that page on the conversation column and keeps the conversation mounted. A current-session change, New Session, and opening a session all call `showPage('home')`. `showPage` is a no-op until the root entry wires panel actions, so the boot session subscriber cannot throw.

**任务看板** (`ui-jobs` `JobBoard`) flattens `jobsBySession` with the same ordering, status words, and duration clock as the header popover. Empty copy is 「暂无任务」 / 「进行中的任务会显示在这里」. A row click returns home and `sessions.open`s that session. Official name remains 后台任务; the sidebar label stays 任务看板. The header popover is unchanged.

**定时任务** (`SchedulePage`) is a 总表 of `{ name, cadence: hourly|daily|weekly, createdAt }` in `localStorage` key `dsh.scheduled-jobs`. Columns: 名称, 周期/规则, 状态, 下次, 操作(删除). State is `scheduled` until the first cadence slot, then `overdue` (this page does not dispatch). The list starts empty and is never seeded. There is no host scheduler write and no user `schedule_*` RPC. A blocked or invalid read opens an empty page; a blocked write keeps the in-memory list for the visit.

The composer plus button opens local `conversation.input.plus` (`onClose`, `locked`) and does not call `toggleCommandMenu`. Slash `/` still opens the command source. The plus control is disabled only when the session is `removed`; hero, locked, and parent-offline composers still open the menu. The menu is `position: fixed` from the + button rect: to the right of +, bottom-aligned with the button so it covers the draft; it flips to the left only when the right side would leave the viewport. While it is open the hero fish (`data-hero-logo`, preview `.logo`) fades so the mark does not stack with the menu. Modes live only in this menu — the input bar does not also show a 标准模式 chip. The model seat is a shrinking flex item that ellipsizes the name and hides the effort caption when the composer row is narrower than 560px. The 工作区 header keeps 10px between clusters and 8px between the view and add icons (72px action cell). Preview title-bar File/Edit/View/Help sit 16px plus 8px padding away from the nav icons.

Plus rows, in order: Plan toggle (开/关, `/plan` / `/plan off`); the four built-in modes 标准 / PTC / 极简 / 创造 (`standard` / `code` / `minimal` / `cordis`, else the first four roster options); Skill with a right chevron that closes the menu and `showPage('skills')`; API 密钥 at the bottom.

Skill and the API-key sheet must not live as local state inside a plus item: `onClose` unmounts plus entries. Skill is `shell.page` id `skills`. The key sheet is `shell.overlay` id `api-key` over a snapshot that stores only `{ open, configured, writable }`.

The Skill page lists `skill.list` (host cwd when there is no session) with `source`, and refetches on forwarded `skills/change`. Left nav splits 内置 (`bundled`, `project-agents`) from 导入. A search field filters the open group; the solid 导入 SKILL.md button (`label-primary` fill) sits to its right as the add action, never inside the list. Each row has a checkbox; new names default on; `dsh.skill-enabled` stores the off set; unchecked rows stay listed and leave the slash catalog. A pick prepends `dsh.imported-skills` (newest first); a later host row of the same name wins. Empty copy for 导入 is 「还没有导入的技能。装上的会按导入顺序排在这里。」

API key writes go through `credentials.set` / `unset` on `DEEPSEEK_API_KEY`. `credentials.describe` is value-free. After save the password field clears and the row shows 「已设置」. 测试 `GET https://api.deepseek.com/models` with the Bearer token from the typed field only; an already-stored key requires re-entry. A CORS or network failure shows 「浏览器拦了跨域，请到开放平台控制台验证。」 and leaves https://api-docs.deepseek.com/zh-cn/ plus https://platform.deepseek.com/api_keys as the verification path. The sheet never logs the key, never reads a machine environment key, and never writes plaintext into preview HTML.

`ctx.settingsPanel` is the write face for the Settings modal so 插件 can `open('plugins')` without rendering the shell.

## Alternatives considered

**Official top-bar / header-only 后台任务.** Rejected for this fork. The header popover stays; the approved chrome is the sidebar row.

**Put 定时任务 in the plus menu.** Rejected. Cadence jobs sit with the plugins group in the sidebar, not in the composer menu.

**Drive 定时任务 from host `schedule_*` tools.** Rejected. Those tools are session-scoped and model-facing; there is no user RPC. Client-local `localStorage` is the persistence that exists.

**Seed sample scheduled jobs or 声场 sessions.** Rejected. Privacy: preview and fixtures start empty and never commit sample jobs or real workspace names.

**Keep plus as the slash Command launcher.** Rejected. The plus menu was empty of Plan, modes, Skill, and the key sheet; `/` already opens commands.

**Open Skill as Settings → Plugins.** Rejected. The right chevron opens a full `shell.page`, not a settings section.

**Store the API key in `localStorage` or echo it after save.** Rejected. The official store is write-only `credentials.set`; the sheet snapshot never holds the secret.

**A new package for the schedule page.** Rejected. The page lives in `ui-jobs` beside the official job board so the two labels stay one plugin.

**Keep Skill or the key sheet as plus-item local state.** Rejected. `onClose` unmounts the menu; those surfaces must outlive it.

**Open the plus menu directly above or below the + button.** Rejected. A panel stacked on the button covers the hero mark and the draft without a clear origin. The menu sits to the right of +, bottom-aligned with the button; it flips left only when that side would leave the viewport.

**Dashed-outline 导入 SKILL.md.** Rejected. The button uses the same solid `label-primary` fill as the product ok / send treatment.

## Consequences

- The sidebar board is a client flatten of the existing per-session `jobsBySession` mirror, not a new host-global jobs read. The [Web background-job display](2026-08-08-web-background-job-display.md) wire frame and header popover still own delivery.
- A scheduled job on this page does not fire the host scheduler and does not appear on 任务看板.
- Browser CORS can block 测试; the Open Platform console remains the authoritative check.
- Assembled Web snapshots gain the sidebar labels 插件 / 任务看板 / 定时任务 when those plugins are composed.
- [Codex shell chrome](2026-08-16-codex-shell-chrome.md) still owns hero copy, settings search, and plugin inventory presentation.

## Testing

- `packages/client/ui-jobs/tests/job-board.client.spec.tsx`, `schedule-page.client.spec.tsx`, `scheduled-jobs.client.spec.ts`, and `sidebar-page-nav.client.spec.tsx` pin empty copy, flatten/open, the 总表 columns, add/list/delete, and storage failure.
- `packages/client/ui-conversation/tests/input-bar.client.spec.tsx`, `input-bar-styles.client.spec.ts`, and `plus-menu-placement.client.spec.ts` pin plus → local menu, right / left placement, `data-plus-open`, no `toggleCommandMenu`, no 标准模式 chip on the closed bar, the shrinking model seat, Escape / outside / session change close, and disabled-only-when-removed.
- `packages/client/ui-model-selection/tests/model-select-styles.client.spec.ts` pins the 560px effort hide and the fill-width trigger.
- `packages/client/ui-workspace/tests/browser-styles.client.spec.ts` pins the 工作区 header 10px / 8px / 72px cluster.
- `packages/client/ui-plan/tests/plan-plus-item.client.spec.tsx`, `ui-agent-preset/tests/agent-preset-plus-menu.client.spec.tsx`, `ui-skill/tests/skill-plus-item.client.spec.tsx`, `skill-page.client.spec.tsx`, `skill-imported.client.spec.ts`, and `parse-skill-md.client.spec.ts` pin the plus rows, catalog groups, search-bar import, newest-first overlay, checkboxes, and 导入 SKILL.md.
- `packages/client/ui-settings-models/tests/api-key-sheet.client.spec.tsx` and `deepseek-key-test.client.spec.ts` pin write-only save/clear, 已设置, CORS copy, and no key logging.
- `preview/codex-shell.html` stays empty of sample sessions and stores only a `dsh.hasApiKey` flag, never a key value.

## Related

- [Web background-job display](2026-08-08-web-background-job-display.md) owns the `session/jobs` frame, the last-wins mirror, and the header popover.
- [Codex-aligned empty hero, settings search, and list chrome](2026-08-16-codex-shell-chrome.md) owns the surrounding Codex chrome this fork already shipped.
