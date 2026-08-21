# Agent Note: Codex 风格的空态标题、设置搜索与列表 chrome

Status: implemented

[English](2026-08-16-codex-shell-chrome.md) | 中文

## 问题

对话列、Review 轨和会话行已经跟上 Codex 桌面端的密度。空态主视觉、设置模态框、侧栏分区标题和插件列表仍像另一套产品：诗意标题、不可搜索的设置导航、最近更新列表上的泛化「会话」标签，以及双列插件卡片网格。Codex 截图首先展示的正是这些页面。

一个诱人的对齐方式是照搬 ChatGPT 消费端 chrome——升级横幅、带 Install 的插件市场，或 Local / Worktree / Cloud 切换器。这些事实在本产品中都不存在。

## 决策

空态标题是本地化问句 `What should we build?` / `我们要构建什么？`。[预览版徽标](2026-08-05-web-preview-product-badge.md) 仍留在同一行，直到首次打标签发布时一并移除。编辑器占位符仍由本产品持有（`描述你想要构建的内容`），不改名为 Codex。

设置导航搜索是外壳对已投影 `settings.section` label 的查看态过滤。文案经 `settings.search` 与 `settings.searchEmpty` 到达。非空查询没有任何匹配时渲染无匹配 seat 且不挂载分区。Escape 会先清空非空查询再关闭面板。「通用」分区把自己的导航 label 渲染为页标题，与其他设置页一致。

侧栏区头仅在单列表且选择最近更新时为**最近**。按工作区分组仍为**工作区**。单列表加手动排序仍为**会话**。树的无障碍名称仍是会话，因为行仍然是会话。

插件列表是单列折叠行：模块短名称、完整模块说明符、启停标签，以及原有的 fiber 状态圆点。它仍是只读 Host 清单。没有 Install 控件，也没有连接器商店。

Ctrl/Cmd+, 会切换设置面板。宽侧栏触发器把该快捷键画在行尾并对辅助技术隐藏，因此无障碍名称仍是设置 seat 文案。本产品没有账号、计费余量、邀请、宠物或登出，所以底栏仍是设置控件，而不是伪造的个人资料菜单。

## 备选方案

**去掉预览版徽标以匹配 Codex 空页。** 否决。预览状态是面向整个产品的身份，不是装饰；持有该决策的笔记禁止运行时隐藏。

**把编辑器改名为 “Message Codex” 并加上 Plus 升级条。** 否决。那些字符串指向另一款产品和本部署没有的商业报价。

**让外壳搜索「通用」行的标题。** 否决。行标题不在分区账本上；外壳必须再发明一条伸进功能行的投影。

**把侧栏默认改成扁平的「最近」列表。** 否决。按工作区分组才是 Host 事实；「最近」只是现有单列表 + 最近更新模式上的区头，不是第二份会话列表。

**加上 Install 按钮或已安装图标条。** 否决。该清单不能启用、停用或拉取市场插件。

**把设置触发器换成账号菜单（剩余用量、Show pet、邀请朋友、登出）。** 否决。没有已登录资料、计费剩余百分比、邀请流程或登出。只有「设置」一项的菜单会多一次点击，却不增加事实。

## 后果

- 组装后的空态快照和无密钥 e2e 字符串跟随新标题。
- 设置搜索不查看分区内部。查询隐藏当前分区时回退到剩余的第一行。
- 「最近」只是区头标签，不是单独的置顶或最近记账。
- 插件行展示真实模块说明符，而不是营销描述。
- 输入框、textarea、select 或 contenteditable 聚焦时，Ctrl/Cmd+, 会被忽略。

## 测试

- `packages/client/ui-conversation/tests/skeleton.client.spec.tsx` 钉住两种语言的标题和预览版徽标。
- `packages/client/ui-settings-general/tests/settings-root.client.spec.tsx` 与 `components.client.spec.tsx` 钉住导航过滤、无匹配文案、Escape 先清查询、「通用」页标题、宽触发器快捷键提示，以及 Ctrl/Cmd+, 切换。
- `packages/client/ui-workspace/tests/workspace-browser.client.spec.tsx` 钉住单列表 + 最近更新时的「最近」，以及单列表 + 手动排序时的「会话」。
- `packages/client/ui-settings-plugin-inventory/tests/components.client.spec.tsx` 钉住列表行上可见的模块说明符。
- `apps/web/tests/snapshots/lifecycle-chrome/hero.expected.md` 与 `plan-active.expected.md` 钉住组装后的英文空态。

## 相关

- [Web 预览版产品徽标](2026-08-05-web-preview-product-badge.md) 仍持有留在新标题旁的徽标。
- [会话跳转轨](2026-08-16-conversation-jump-rail.md) 与 [Codex Review 列](2026-08-16-codex-review-column.md) 持有已经交付的 transcript chrome；本笔记不改它们。
- [Codex 侧栏任务看板、定时任务与加号菜单](2026-08-21-codex-sidebar-jobs-and-plus-menu.md) 拥有加号菜单行和侧栏页面触发器；本笔记仍拥有 hero 文案、设置搜索和插件清单 chrome。
