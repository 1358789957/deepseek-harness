# Agent Note: Review 列是会话窗口 chrome，不是 Git

Status: implemented

[English](2026-08-16-codex-review-column.md) | 中文

## 问题

Codex 把 Review 放在右侧列：当前线程的变更、产出物和任务，由页头控件或 Cmd/Ctrl+Alt+B 打开。DeepSeek Harness 已有一条给选中工具调用用的详情轨。若用虚构的 Git staged／unstaged、提交或行内评论 review 去填满该轨，就会承诺会话并不拥有的仓库事实。

第二个失败是打开态的所有权。布局 store 的详情宽度是偏好：让步和 blank Session 可以把列渲染成零宽，而偏好仍保持打开。若会话本地再镜像「用户要求打开 Review」，页头就会保持按下、Escape 仍然挂着，并且 `openDetails` 对读者看不见的列变成空操作。

## 决策

Review 作为 `@deepseek-ai/dsh-client-ui-conversation` 里的 DetailsPanel chrome，占用布局 `details` slot。变更、仅产出路径和任务由已加载的对话快照与当前 `todos` 投影折叠而成。没有 Git 后端、staged／unstaged 选择器、提交列表或行内 review。

页头 Review 工具和 Cmd/Ctrl+Alt+B 切换 `ctx.layout` 的打开／关闭。AppFrame 在详情 owner share 上发布渲染后的列（`open`、`available`），并打上 `data-app-frame`／`data-details-available`。页头按下态跟随该渲染后的 `open` 位。`available` 为 false 时，控件和快捷键保持无效。仅当 `open` 为 true 时，Escape 才监听。

从页头或快捷键打开 Review 会把 `selection` 写成 `null`，因此不会带回残留的工具输入／输出区。点击工具行仍会选中该调用并打开该列。

跳转轨仍是 ChatView chrome；见 [会话跳转轨](2026-08-16-conversation-jump-rail.md)。

## 备选方案

**Git 后端的 Review（staged／unstaged、提交、推送、行内评论）。** 会话窗口并不拥有工作树。虚构 SHA 或 hunk 会说谎。仓库 review 仍是以后的能力，并拥有自己的 store。

**只跟踪布局操作的会话本地打开位。** 切换会话和让步会改变渲染宽度，却不调用会话的关闭回调，于是页头和 Escape 会失步。AppFrame 已经在求解列宽；由它发布渲染后的位。

**一个 `conversation.view` Review 标签页。** Codex 把 Review 留在同一条线程旁边。标签页会替换 transcript（文本记录）。

**从页头打开时保留上次的工具选中。** Codex 的 Review 是变更和任务。把先前点击工具留下的输入／输出重新唤起，会让该列看起来像过期的检查器。

## 测试

- `packages/client/ui-layout/tests/columns.client.spec.ts` 把 `detailsTrackFits` 钉在让步下限。
- `packages/client/ui-layout/tests/app-frame.client.spec.tsx` 钉住详情 owner props 和 `data-details-available`。
- `packages/client/ui-conversation/tests/review-pane.client.spec.tsx` 钉住仅在打开时响应 Escape、列打开镜像，以及 frame 无法分配该轨时的快捷键。
- `packages/client/ui-conversation/tests/apply-inject.client.spec.tsx` 钉住页头切换、清除选中和 `setColumnOpen`。
- `apps/web/tests/produced-file-mentions.e2e.ts` 钉住组装后的 Review 列。

## 后果

- Review 只列出已加载窗口；更早历史仍要走 `chat.loadOlder`，会话外的编辑不会出现。
- 被让步的窗口变宽时会恢复布局偏好；页头再次跟随渲染宽度。
- blank Session 以及放不下 `DETAILS_MIN` 的 viewport 会隐藏 Review，而不是在空轨上显示按下的控件。
