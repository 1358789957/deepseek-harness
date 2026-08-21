# Agent Note: Codex sidebar task board, scheduled jobs, and plus menu

Status: implemented

[English](2026-08-21-codex-sidebar-jobs-and-plus-menu.md) | 中文

## Problem

已对齐 Codex 的外壳已有宽侧栏和 composer 加号，但三个人类入口缺失或放错了位置。

官方 DSH 的后台任务（当前会话可见的 `ctx.jobs` 工作）已有会话标题栏弹层。本 fork 已批准的 chrome 把它放在侧栏、标成**任务看板**，位于「新会话」和「插件」之后，用中央栏页面替换主视觉区，而不是打开顶栏面板。

**定时任务**是另一件产品事实：用户填写的名称加周期。宿主 `schedule_*` 工具按会话作用域、面向模型；没有用户 RPC，也没有客户端 UI。把 cron 放进加号菜单，或预置示例任务，会把两个功能混在一起，并泄漏真实工作区名称。

加号控件当时仍打开 slash Command 菜单，因此 Plan、四种 agent 模式和 Skill 没有始终可见的 composer 入口。Skill 必须打开整页，而不是「设置 → 插件」。API 密钥在「设置 → 模型」中输入：只写、永不回显。

预览和 fixtures 不得包含用户项目「声场」、跳转轨会话或其他真实工作区名称。

## Decision

`sidebar.nav` 是「新会话」与 `sidebar.workspaces` 之间、仅宽栏渲染的列表。占用方：插件（`order: 0`，打开设置的插件分区并把中央栏切回 `'home'`）、任务看板（`order: 10`）、定时任务（`order: 20`）。窄轨不为这些行提供独立图标。

`ctx.layout.showPage(page)` 写入布局 store 的 `page`。`'home'` 显示会话；其他 id 必须对应一条 `shell.page` 注册。AppFrame 把该页叠在会话栏上，并保持会话挂载。当前会话变化、新会话、打开会话都会调用 `showPage('home')`。根条目尚未接上面板动作时 `showPage` 是空操作，启动期的会话订阅因此不会抛错。

**任务看板**（`ui-jobs` 的 `JobBoard`）按与标题栏弹层相同的排序、状态词和耗时时钟扁平化 `jobsBySession`。空态文案是「暂无任务」／「进行中的任务会显示在这里」。点击一行会回到 home 并对该会话调用 `sessions.open`。官方名称仍是后台任务；侧栏标签保持任务看板。标题栏弹层不变。

**定时任务**（`SchedulePage`）是 `{ name, cadence: hourly|daily|weekly, createdAt }` 的总表，存在 `localStorage` 键 `dsh.scheduled-jobs`。列：名称、周期/规则、状态、下次、操作（删除）。状态在第一个周期槽之前为 `scheduled`，之后为 `overdue`（本页不投递）。列表从空开始，永不预置。不写宿主调度器，也没有用户 `schedule_*` RPC。读取被拦或 JSON 无效时打开空页；写入被拦时本次访问仍保留内存列表。

composer 加号打开本地 `conversation.input.plus`（`onClose`、`locked`），不调用 `toggleCommandMenu`。Slash `/` 仍打开命令源。仅当会话 `removed` 时禁用加号；hero、锁定和父会话离线的 composer 仍可打开菜单。菜单相对 + 按钮用 `position: fixed` 定位：开到 + 右侧，底边与按钮对齐从而盖住草稿；只有右侧会超出视口时才翻到左侧。菜单打开时 hero 鱼标（`data-hero-logo`，预览 `.logo`）淡出，避免和菜单叠在一起。模式只出现在该菜单里——输入栏不再另放「标准模式」chip。模型 seat 是可收缩的 flex 项：名称省略号截断，composer 行窄于 560px 时隐藏推理等级文案。工作区区头在簇之间留 10px，视图与添加图标之间留 8px（72px 操作格）。预览标题栏 File/Edit/View/Help 与导航图标相距 16px，并另有 8px 内边距。

加号行顺序：Plan 开关（开／关，`/plan`／`/plan off`）；四种内置模式 标准／PTC／极简／创造（`standard`／`code`／`minimal`／`cordis`，否则取名单前四项）；右侧带 chevron 的 Skill，关闭菜单后 `showPage('skills')`。

Skill 不得作为 plus 项的本地 state：`onClose` 会卸载 plus 条目。Skill 是 `shell.page` id `skills`。

Skill 页列出 `skill.list`（没有会话时列出宿主 cwd）并带 `source`，在转发的 `skills/change` 上重新拉取。左侧导航把内置（`bundled`、`project-agents`）和导入分开。搜索框过滤当前分组；实心「导入 SKILL.md」按钮（`label-primary` 填充）在其右侧作为添加动作，不进列表正文。每行有复选框；新名称默认勾选；`dsh.skill-enabled` 只存关掉的集合；未勾选的行仍列出，但不进 slash 目录。选中的文件会前置写入 `dsh.imported-skills`（最新在前）；之后同名的宿主行优先。导入空态是「还没有导入的技能。装上的会按导入顺序排在这里。」

API 密钥经 Models 页的 `ProviderEditor`（以及 DeepSeek 引导步骤）用 `credentials.set`／`unset` 写入。`credentials.describe` 不含值。保存后密码框清空，行上显示已配置徽标。页面从不记录密钥、从不读取机器环境密钥，也从不把明文写入 composer 菜单。

`ctx.settingsPanel` 是设置模态的写入面，因此「插件」可以 `open('plugins')` 而不自己渲染外壳。

## Alternatives considered

**官方顶栏／仅标题栏的后台任务。** 本 fork 拒绝。标题栏弹层保留；已批准的 chrome 是侧栏行。

**把定时任务放进加号菜单。** 拒绝。周期任务和插件组一起待在侧栏，不进 composer 菜单。

**用宿主 `schedule_*` 工具驱动定时任务。** 拒绝。那些工具按会话作用域、面向模型，没有用户 RPC。客户端 `localStorage` 才是现有的持久化。

**预置示例定时任务或「声场」会话。** 拒绝。隐私：预览和 fixtures 从空开始，永不提交示例任务或真实工作区名称。

**让加号继续做 slash Command launcher。** 拒绝。加号菜单当时没有 Plan、模式和 Skill；`/` 已经打开命令。

**把 Skill 打开成「设置 → 插件」。** 拒绝。右侧 chevron 打开整页 `shell.page`，而不是设置分区。

**把 API 密钥存在 `localStorage` 或保存后回显。** 拒绝。官方存储是「设置 → 模型」上只写的 `credentials.set`；编辑器在保存后不持有秘密。

**把 API 密钥放进加号菜单。** 拒绝。「设置 → 模型」已经拥有只写的 `ProviderEditor`；加号列表是 Plan、模式和 Skill。

**为定时任务页新建一个包。** 拒绝。该页和官方任务看板一起放在 `ui-jobs`，两个标签同属一个插件。

**让 Skill 作为 plus 项的本地 state。** 拒绝。`onClose` 会卸载菜单；Skill 页必须比菜单活得更久。

**让加号菜单直接叠在 + 上方或下方。** 拒绝。贴着按钮堆叠会同时盖住 hero 鱼标和草稿，来源也不清楚。菜单开在 + 右侧、底边与按钮对齐；只有这一侧会超出视口时才翻到左侧。

**虚线描边的「导入 SKILL.md」。** 拒绝。该按钮使用与产品 ok／发送相同的实心 `label-primary` 填充。

## Consequences

- 侧栏看板是对现有按会话 `jobsBySession` 镜像的客户端扁平化，不是新的宿主全局 jobs 读取。[Web 后台任务展示](2026-08-08-web-background-job-display.md) 的线路帧和标题栏弹层仍拥有投递。
- 本页上的定时任务不会触发宿主调度器，也不会出现在任务看板。
- 本 fork 的 `dsh web` 从 web-app 名录加载 `ui-jobs`、`ui-skill`、`ui-plan`、`ui-agent-preset` 和 `ui-settings-models`；`preview/codex-shell.html` 不是已服务的 GUI。
- 组装后的 Web 快照在组合了这些插件时会多出侧栏标签「插件」／「任务看板」／「定时任务」。
- [Codex 外壳 chrome](2026-08-16-codex-shell-chrome.md) 仍拥有本 fork 已交付的 hero 文案、设置搜索和插件清单呈现。

## Testing

- `packages/client/ui-jobs/tests/job-board.client.spec.tsx`、`schedule-page.client.spec.tsx`、`scheduled-jobs.client.spec.ts` 和 `sidebar-page-nav.client.spec.tsx` 钉住空态文案、扁平化／打开、总表列、添加／列表／删除，以及存储失败。
- `packages/client/ui-conversation/tests/input-bar.client.spec.tsx`、`input-bar-styles.client.spec.ts` 和 `plus-menu-placement.client.spec.ts` 钉住加号 → 本地菜单、向右／向左定位、`data-plus-open`、不调用 `toggleCommandMenu`、关闭的输入栏上没有「标准模式」chip、可收缩的模型 seat、Escape／外部／会话切换关闭，以及仅在 removed 时禁用。
- `packages/client/ui-model-selection/tests/model-select-styles.client.spec.ts` 钉住 560px 时隐藏推理等级以及触发器铺满宽度。
- `packages/client/ui-workspace/tests/browser-styles.client.spec.ts` 钉住工作区区头 10px／8px／72px 簇。
- `packages/client/ui-plan/tests/plan-plus-item.client.spec.tsx`、`ui-agent-preset/tests/agent-preset-plus-menu.client.spec.tsx`、`ui-skill/tests/skill-plus-item.client.spec.tsx`、`skill-page.client.spec.tsx`、`skill-imported.client.spec.ts` 和 `parse-skill-md.client.spec.ts` 钉住加号行、目录分组、搜索栏导入、最新在前的叠加层、复选框和「导入 SKILL.md」。
- `packages/client/ui-settings-models/tests/apply.client.spec.ts` 钉住 Models 不占用 `conversation.input.plus`；`components.client.spec.tsx` 钉住只写的 `ProviderEditor` 保存且不回显秘密。

## Related

- [Web 后台任务展示](2026-08-08-web-background-job-display.md) 拥有 `session/jobs` 帧、后写覆盖镜像和标题栏弹层。
- [Codex 对齐的空态 hero、设置搜索与列表 chrome](2026-08-16-codex-shell-chrome.md) 拥有本 fork 已经交付的周围 Codex chrome。
