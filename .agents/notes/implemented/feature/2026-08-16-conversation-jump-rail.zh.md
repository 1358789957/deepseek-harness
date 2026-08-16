# Agent Note: 会话跳转轨留在 ui-conversation 内

Status: implemented

[English](2026-08-16-conversation-jump-rail.md) | 中文

## 问题

长 Chat transcript（文本记录）只能线性滚动。Codex 与声场用左侧 gutter 轨解决：悬停附近一轮以预览，点击即跳转。DeepSeek Harness 的 Chat 已有滚动容器和稳定行身份，却没有对等的 scrubber，读者要找更早的提示词只能滚完整窗。

一个诱人的修法是新增 `root` 或 `conversation.view` 插件盖在列上。那会从 ChatView 抢走 chrome，要求一次本包并不拥有的 root 注册，并复制 ConversationRoot 已经预留的滚动容器约定。

## 决策

跳转轨是 `@deepseek-ai/dsh-client-ui-conversation` 里的 ChatView chrome。它不注册到 `root`，也不是 `conversation.view` 标签页。

`collectMapMessages` 读取已加载的 Chat 顺序，保留 `user` 与非空 `assistant-step` 行。`buildTurns` 把每条用户消息与紧随其后的助手回复收成一轮。仅当已加载窗口中有两轮及以上用户消息时才渲染该轨。每个刻度是按钮：悬停（300ms 后，或预览已打开时立即）显示该轮标题、状态和至多两行助手摘要；点击或键盘激活会在解析出的会话滚动容器上调用 `jumpToMessage`（嵌套时为 `[data-conversation-scroll]`，否则为视图本地 scroller）。`ChatNodeSeat` 把 Node key 打到 `data-conversation-message` 上，因此跳转不会拼接选择器。

该轨是 Chat scroller 左侧的零尺寸 sticky overlay，会话滚动条仍在右侧。宽度低于 720px 时宿主隐藏；窄列会与 transcript 相撞。手动跳转通过 `onManualNavigate` 清掉 ChatView 的贴底跟随。

## 备选方案

**注册一个 root overlay 插件。** root 占用者会落在 ChatView 的滚动算法之外，需要在 shell 上新增 slot 声明，并且没有第二条订阅路径就读不到 Chat Node store。该轨是聊天流控件；ChatView 已经拥有顺序、滚动容器和跟随钉。

**增加一个 `conversation.view` 标签页。** 地图标签页会替换 transcript，而不是在同一条线程里 scrub。Codex／声场把轨留在读者正在看的那条线程旁边。

**每个 Chat Node（含工具）一个标记。** 工具行和 chrome 行不是轮次。每个用户提示一个标记，符合读者查找「我问过的那句」的方式。

**始终可见的预览列表。** 常驻卡片会与 transcript 抢位置。悬停／聚焦卡片足以选定跳转目标。

## 测试

- `packages/client/ui-conversation/tests/conversation-map.client.spec.ts` 钉住收集、轮次分组、预览压缩，以及标记／跳转数学。
- `packages/client/ui-conversation/tests/conversation-map-view.client.spec.tsx` 钉住 gutter、延迟悬停预览、点击跳转、键盘刻度、缺失锚点，以及减少动态效果时的滚动。

## 后果

- 短线程（零轮或一轮用户消息）不显示该轨。
- 只有已加载窗口可跳；更早历史仍要走 `chat.loadOlder`。
- steering（中途引导）气泡不是标记；它们仍是轮次中途的流程行。
- 该轨在左缘增加命中目标；720px 截止让它们离开窄列。
