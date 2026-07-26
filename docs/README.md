# yindex 文档索引

## 当前权威

| 文档 | 用途 |
|---|---|
| [`../README.md`](../README.md) | 用户入口、v0.2 能力摘要与 GitHub 安装 |
| [`../INSTALL.md`](../INSTALL.md) | 固定 `yindex-extension/` 文件夹安装、覆盖更新与 v0.1.x 升级边界 |
| [`../CONTEXT.md`](../CONTEXT.md) | 领域词表与禁用混称 |
| [`../PRODUCT.md`](../PRODUCT.md) | 耐久产品事实、用户、目的、约束与原则 |
| [`product-spec.md`](./product-spec.md) | v0.2 产品规格、交互、Widget、Package 与本机数据 |
| [`../DESIGN.md`](../DESIGN.md) | v0.2 Liquid Glass 设计系统；当前视觉最高权威 |
| [`design/style-packs.md`](./design/style-packs.md) | MOMENT / MUSE / FLOW Style Pack 与统一 Liquid Glass tokens |
| [`adr/`](./adr/) | 架构决策记录 |

当前实现位于 `packages/`。默认 Home 为 **此刻 / 灵感 / 流光**，共用统一 Liquid Glass 与 Adaptive Glass；图片和视频 Wallpaper 可从本地导入，媒体保存在 OPFS。Extension 使用 `unlimitedStorage` 支持本地资源，但可用空间仍由设备和 Chrome 决定。

## ADR 一览

| 编号 | 标题 |
|---|---|
| [0001](./adr/0001-local-chrome-storage-for-home-config.md) | Home 配置仅落本机 `chrome.storage` |
| [0002](./adr/0002-third-party-widgets-via-local-package-import.md) | 第三方 Widget Package：本地导入、sandbox 与能力桥 |
| [0003](./adr/0003-chrome-only-mv3-new-tab.md) | 仅 Chrome MV3 new tab / unpacked |
| [0004](./adr/0004-viewport-percent-layout.md) | Layout 使用视口百分比坐标 |
| [0005](./adr/0005-vite-react-typescript.md) | Vite + React + TypeScript |
| [0006](./adr/0006-page-style-cascade.md) | Page Style 级联与 Widget Instance 覆盖 |
| [0007](./adr/0007-storage-split-config-packages-wallpapers.md) | 配置、Widget Package 与 Wallpaper 分存 |
| [0008](./adr/0008-monorepo-packages-by-feature.md) | monorepo 按产品能力拆包 |
| [0009](./adr/0009-unified-liquid-glass-material-language.md) | 全产品采用统一 Liquid Glass 材质语言 |
| [0010](./adr/0010-no-backward-compatibility-before-public-release.md) | 正式公开发布前不承诺向后兼容；v0.1.x 与 v0.2 不兼容 |

## 历史设计资料

- [`design/APPROVAL.md`](./design/APPROVAL.md) 保存 2026-07-23 的旧设计审批记录；已明确标记为历史且被 v0.2 取代。
- [`design/comps/`](./design/comps/) 中旧 HTML/PNG 仅用于追溯，不是当前实现或视觉验收依据。
- 历史背景可以保留在 ADR 与带有明确 **HISTORICAL / SUPERSEDED** banner 的资料中；当前指导必须回到 `DESIGN.md` v0.2。

## 后置范围

- Hexagram 动爻、变卦与爻辞高级模式
- 用户自定义 Page Template 的保存与分享
- 云同步、账号系统、Chrome Web Store 与在线 Widget Store
