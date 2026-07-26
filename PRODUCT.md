# Product

<!-- impeccable:product-schema 1 -->

## Platform

Chrome Manifest V3 new tab Extension；v0.2 的分发合同是通过 GitHub Release 提供 unpacked 安装包，不承诺 Chrome Web Store 分发。只有目标版本附件实际出现在 Releases 后，用户安装路径才成立。

## Users

yindex v0.2 首先服务作者本人和愿意使用 Chrome 开发者模式的开发者朋友。他们需要高度可编排、可扩展、数据留在本机的个人新标签页，也愿意从本地 zip 导入高信任的第三方 Widget Package。

## Product Purpose

yindex 接管 Chrome 新标签页，将其变成可组装的 Home。用户在多个全屏 Page 上自由布置 Widget，为每个 Page 配置独立 Style 与 Wallpaper，并以纵向整页 Page Turn 在场景之间移动；Page Sequence 首尾 Loop。

v0.2 验收标准：

1. 默认 **此刻 / 灵感 / 流光** 三个 Page，可纵向循环翻页
2. 一套统一 Liquid Glass 材质语言贯穿所有 Page 与编辑器，Adaptive Glass 自动守住可读性
3. 可编辑 Layout、Style、Glass Profile 与 Wallpaper
4. 核心内置 Widget 可用，可导入并运行至少一个第三方示例 Package
5. Home 配置、本地 Wallpaper 与 Package 资源在重开新标签页后保留

## Positioning

yindex 不是固定仪表盘，也不是只换配色的单一主题新标签页。它把 Home 建模为可循环的 Page Sequence：每个 Page 是独立 Style、Wallpaper 与自由 Layout 的全屏场景，由同一宿主和编辑系统管理；第三方能力通过本地 Widget Package、sandbox 与类型化能力桥扩展。

## Operating Context

- 用户通过 Chrome 新标签页高频进入 Home
- Browse Mode：纵向 Page Turn 与 Widget 交互
- Edit Mode：拖放、缩放、Snap、添加内置 Widget、Style、Wallpaper 与 Page Sequence
- Settings：Glass Profile、高级玻璃微调、Widget Package 管理、Wallpaper 资源、重置与导入导出
- 默认 Page Sequence：**此刻（Landing）→ 灵感 → 流光**
- 原始素材 `1784710540_1784710529242_d.png` 服务 Hexagram Board，不是产品本体

## Default Scenes

| Page | Style Pack | Wallpaper 光场 | 默认内容 |
|---|---|---|---|
| 此刻 | MOMENT | 晨光生成式 Wallpaper | 日期天气、搜索、快捷方式 |
| 灵感 | MUSE | 暖墨生成式 Wallpaper | 每日一句、Hexagram Board |
| 流光 | FLOW | 深海夜光生成式 Wallpaper | 大时钟与日期 |

三者共用同一套 Liquid Glass 材质系统。场景差异来自 Wallpaper、seed palette、字体气质与构图，不来自独立材质系统。

## Capabilities and Constraints

- Chrome MV3，仅 Chrome；开发者模式加载 unpacked 目录；最低 Chrome 120
- GitHub Release zip 固定展开为 `yindex-extension/`；更新必须覆盖 Chrome 已加载的同一文件夹后点击「重新加载」
- v0.1.x 是内部开发快照，和 v0.2 的 Home schema、Style 与媒体引用不兼容；不保证 v0.1.x 导出文件可以导入 v0.2
- Vite + React + TypeScript；Bun monorepo + Vite multi-entry；关键域 TDD
- Page Sequence 有序可循环，至少一个 Page；Page 有名称和图标
- Layout 使用视口百分比坐标、自由定位、Snap、可重叠与 z 层级；不旋转
- Style 属于 Page；Style Pack 是预设起点，允许受保护的深度自定义；Wallpaper 属于 Style
- 默认 Wallpaper 为本机实时渲染的 Generative Wallpaper；用户可导入本地图片或视频 Wallpaper
- Home 配置存 `chrome.storage`；Widget Package 资源存 IndexedDB；Wallpaper 媒体存 OPFS
- Extension 申请 `unlimitedStorage` 以支持本地 Wallpaper 和 Package 资源；实际容量仍受设备与 Chrome 存储策略约束
- 支持轻量 JSON 导出；导入前验证 schema。配置导出不等于媒体与 Package 的跨设备备份
- 内置：时钟、搜索、快捷方式、每日一句、天气、Hexagram Board
- Hexagram Board：每日手动抽本卦、矩阵、公版卦辞/象传与简注；不做个性化吉凶断言
- 第三方：本地 zip 导入；sandbox iframe + 类型化能力桥；Package manifest 声明能力范围，Instance 级 iframe 与错误隔离
- UI 仅中文；WCAG 2.2 AA 自检；reduced-motion 降级 Page Turn、动态 Wallpaper 与视频 Wallpaper
- 暖启动目标：本地配置下 Landing 首屏可交互 < 300ms

## Brand Commitments

- 产品名：yindex
- **Creative North Star：一扇窗 / Living Glass**。Wallpaper 是世界，Widget 是浮在窗上的玻璃透镜
- Liquid Glass 是统一且默认的产品材质语言，不是某一 Page 的可选装饰
- Adaptive Glass 根据 Wallpaper 明暗、色彩与细节密度调整玻璃与前景；最低可读性保护不可关闭
- Glass Profile 首发为 **清透 / 均衡 / 沉静**，高级微调在档位边界内叠加
- Page 可以拥有完全不同的光场、色调、字体气质与构图，但不另造材质系统
- Page Turn 接近手机换屏，方向纵向，不是长页滚动
- 对第三方必须说明「导入即信任其经桥获得的能力」；sandbox 是执行边界，不代表零能力

当前视觉权威是 [`DESIGN.md`](./DESIGN.md) v0.2 与 [`docs/design/style-packs.md`](./docs/design/style-packs.md)。旧材质方向与旧 comps 仅作为历史记录，不再指导实现。

## Local Data and Privacy

- 配置、Wallpaper 和 Widget Package 默认只留在当前浏览器本机，yindex 不提供账号或云同步
- 本地图片或视频导入前验证类型、扩展名、字节签名与大小；不可见 Page 暂停视频并停止生成式 Wallpaper 渲染
- Settings 提供 Wallpaper 资源占用与引用保护；正在被 Page 使用的资源不能直接删除
- 「恢复默认主页」保留本地 Wallpaper 和 Package；「完全清除」永久删除三类本地数据并恢复默认 Home
- 卸载 Extension 可能删除本地数据；重要内容应在卸载前主动备份

## Evidence on Hand

- 当前实现：`packages/`
- 安装与打包：`INSTALL.md`、`scripts/pack-extension.sh`
- 产品规格：`docs/product-spec.md`
- 当前设计系统：`DESIGN.md`、`docs/design/style-packs.md`
- 架构决策：`docs/adr/`
- 卦表素材：`1784710540_1784710529242_d.png`

## Product Principles

1. **页是场景，不是容器列表。**
2. **一套 Liquid Glass 材质系统，多个光场世界。**
3. **浏览顺滑，编辑显式。**
4. **默认可用，深度可塑。**
5. **用户数据可恢复、可清理。**（自动保存、撤销、Missing Widget、资源引用保护）
6. **信任边界说真话。**

## Accessibility & Inclusion

v0.2 以 WCAG 2.2 AA 自检：主路径键盘可达、焦点可见、语义标签；系统 reduced-motion 时 Page Turn 改为短淡入，动态/视频 Wallpaper 停在静态帧；Adaptive Glass 对正文维持至少 4.5:1 对比，并对关键非文本控件维持至少 3:1。
