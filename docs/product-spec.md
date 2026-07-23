# yindex 产品规格（已确认）

> 访谈结论终稿。与 `PRODUCT.md`（产品事实）、`CONTEXT.md`（领域词表）、`docs/adr/`（架构决策）一致。  
> 未确认项仅保留「后置」清单；不作为实现代码。

## 1. 产品定义

yindex 是接管 **Chrome 新标签页** 的可组装 **Home**。Home 由有序 **Page Sequence** 构成；每个 **Page** 是一张拥有独立 **Style**、**Layout** 与 **Widget Instance** 的全屏画布。用户以纵向 **Page Turn** 在相邻 Page 间切换，序列首尾 **Loop**。

### 1.1 用户与分发

| 项 | 决策 |
|---|---|
| 首批用户 | 作者本人与开发者朋友 |
| 浏览器 | 仅 Chrome，Manifest V3 |
| 安装 | 开发者模式加载 unpacked；v1 不以 Chrome Web Store 上架为目标 |
| 语言 | 产品 UI 仅中文；Hexagram 经典原文保持传统文本 |
| 账号/云 | 无自建账号与云同步 |

### 1.2 v1 验收线

1. 默认 3 个不同 Style 的 Page，可纵向循环翻页  
2. 可编辑 Page Layout 与 Style  
3. 首发内置 Widget 可实际使用  
4. 可导入并运行至少一个第三方示例 Package（番茄钟 / 专注计时）  
5. 关闭并重新打开新标签页后，配置不丢失  

## 2. Page 与导航

- Page Sequence：有序、可增删/复制/重排；**至少 1 个 Page**
- Page 元数据：用户可编辑的 **名称 + 图标**
- 内置 Page Templates：`空白`、`知识·典籍`、`启动·精密工具`、`氛围·沉浸光雾`  
  - 新建可选：空白 / 内置模板 / 复制当前页  
  - v1 **不支持**用户保存/分享自定义 Template
- Page Turn：整页纵向平移；非连续长页滚动
- Loop：末页下一页为首页
- Landing：默认固定 Landing Page（启动页）；Settings 可改为「记住上次所在页」
- 指示器：侧边点状指示器，可点击跳转
- 滚轮：悬停可滚动 Widget 时优先给 Widget，否则翻页  
  - 累积位移阈值 + 短冷却；抑制触控板惯性连翻  
  - **Edit Mode 禁用滚轮翻页**
- 键盘（浏览态）：↑↓ 或 PageUp/PageDown 相邻翻；数字 1–9 跳序号页；Esc 关闭全屏层
- reduced-motion：翻页改淡入/瞬切；动态/视频壁纸改静态封面

### 2.1 默认 3 页

| 位置 | 职责 | Style Pack | 默认内容 |
|---|---|---|---|
| 上 | 知识 | 知识·典籍 | 每日一句 + Hexagram Board |
| 中（Landing） | 启动 | 启动·精密工具 | 搜索 + 快捷方式 + 天气 |
| 下 | 氛围 | 氛围·沉浸光雾 | 大时钟/日期 + 沉浸 Wallpaper |

三页为 **三个完整视觉世界**（字体/构图/材质/色彩可完全不同）；仅共享 Page Turn、编辑器规则与可用性底线。

## 3. Layout

- 坐标系：相对视口百分比 `x / y / w / h` + 显式 `z`
- 自由定位；Edit Mode 拖放、缩放、Snap
- Snap 参考：安全边距、逻辑网格、其他 Widget 边/中心、三分线、黄金分割线  
  - 默认开；**Alt/Option** 临时关闭
- 允许重叠；多选 + 对齐/分布/统一尺寸；**不旋转**（轴对齐矩形）
- 编辑后矩形必须完全在 Page 安全区内；窗口变化时百分比保持 + min 尺寸/边界修正
- v1 **单套**流式 Layout，无断点多套画布
- 同 Type 允许多 Instance

## 4. Style

- Style 属于 Page；先套 Style Pack，再深度自定义
- Wallpaper 是 Style 底层属性（非普通 Widget）  
  - 支持：静态图、短循环视频、动态生成纹理  
  - 仅当前可见 Page 播放重动态/视频；离开即停  
  - Package ≤ 50MB；视频 Wallpaper ≤ 100MB
- Widget 默认继承 Page tokens；Instance 可局部覆盖  
  - 换 Pack：更新 Page 默认，**保留** overrides；可「恢复跟随页面」
- Liquid Glass：默认强用于「氛围·沉浸光雾」；其它页为可选 token，不强制全站玻璃
- Token 分组：`color`、`typography`、`space/radius`、`elevation`、`glass`、`wallpaper`、`motion`  
  - 视觉世界 **三材质三联画** 与 token 细则：`DESIGN.md`、`docs/design/style-packs.md`

## 5. 模式与编辑

| 模式 | 职责 |
|---|---|
| Browse Mode | 翻页与 Widget 交互 |
| Edit Mode | Layout / Style / Widget / Page Sequence；主入口为右下角或边栏「编辑」 |
| Settings | 高级选项、Catalog、资源管理、分级重置、导出导入等 |

- 编辑：**实时自动保存** + 会话内撤销/重做
- 侧栏：当前页精细管理、属性、顺序、默认落点  
- Overview：全页缩略、跳转、拖拽重排、复制/删除  
- 编辑器 UI：结构与控件语义全局稳定；仅 **强调色 + 轻微环境染色** 跟随当前 Page；字体/控件形态/文字色/语义色稳定；明暗跟随系统

## 6. 内置 Widget

### 6.1 运行时划分

| 路径 | Widget |
|---|---|
| 直挂宿主 React 树 | 日期时钟、搜索、快捷方式、每日一句、天气 |
| SDK + sandbox | Hexagram Board、番茄钟示例包、全部第三方 Package |

### 6.2 行为摘要

- **日期时钟**：大时钟 + 日期与星期  
- **搜索**：可选引擎，默认 Google；可自定义搜索 URL  
- **天气**：默认 Open-Meteo（无 key）；可选其它需 key 源；定位或手动城市  
- **快捷方式**：独立启动台列表；可从 Chrome 书签导入，不强制同步书签树  
- **每日一句**：默认 Hitokoto；可选类型、自定义源、刷新周期（默认一日）、手动刷新；失败有缓存/回退  
- **Hexagram Board**（见下）

### 6.3 Hexagram Board v1

- 8×8 上下卦矩阵查询  
- 用户每日手动抽一卦；v1 **仅随机本卦**（动爻/变卦/爻辞 → v1.1，模型预留）  
- 默认当天锁定、次日按本地日期重置；Settings 可允许重抽  
- 展示公版卦辞/象传 + 项目自写简注；**不做**个性化吉凶断言  
- 完整卦库：默认全屏知识层（内滚、暂停 Page Turn）；可选独立 Extension 页  
- 笔记：每卦长期笔记 + 每日抽取日志/感想  

## 7. 第三方 Widget Package

- 导入：本地 zip/目录  
- 信任：**导入即高度信任**（可调用桥所授权能力）；执行在 **sandbox**，经 **宽能力桥**，**非**与宿主同 JS 域  
- 每 Instance 独立 sandbox iframe；不可见默认挂起，邻页可预热  
- 故障：实例级错误占位（重试/禁用/日志/移除）  
- 身份：`packageId` + semver；一包多 Type  
- Manifest 最少：`packageId`、`name`、`version`、`engines`、`yindexApiVersion`、`types[]`、`permissions[]`、`hostPermissions[]`；可选 migration、icons  
- 宿主 `yindexApiVersion = 1`；包用 `engines.yindex`（如 `>=1 <2`）；主版本不兼容拒绝导入  
- 权限：包声明 → 导入时逐项请求；未声明/未授权由桥拒绝  
- 桥：Chrome API schema 生成类型化适配器；默认 5s 超时；可开关开发者日志 + 每实例轻量限流；无 `rawCall`  
- 升级：原子；失败回滚上一版本与配置快照  
- 卸载：保留 Missing Widget、配置与 Layout；重装同 `packageId` 恢复  
- 示例验收包：番茄钟 / 专注计时  

## 8. 数据与性能

| 数据 | 存储 |
|---|---|
| Home/Page/Widget 结构化配置 | `chrome.storage` |
| Widget Package 资源 | IndexedDB |
| Wallpaper 媒体 | OPFS |

- 根 `schemaVersion` + 分模块 migration；Package 实例配置按包版本迁移；失败保留原始 JSON  
- 导出：默认轻量 JSON（配置 + 引用/校验和）；可选完整 zip（含媒体与包资源）  
- 导入：校验 schema；媒体缺失可占位  
- Settings：资源管理器（占用、删未引用）；启动引用完整性检查；配额警告  
- 分级重置：当前页 / 默认 3 页 / 全部配置（可选是否清 Package）；二次确认  
- 暖启动：本地已有配置时 Landing **首屏可交互 < 300ms**（先骨架与 Wallpaper，再预热/iframe）  
- 无障碍：WCAG 2.2 AA 自检；主路径键盘可达、焦点可见、语义标签；各 Style 正文对比底线  

## 9. 工程方向

- Vite + React + TypeScript  
- monorepo（Bun workspace + Vite multi-entry）  
- 关键域 **TDD**（Sequence、Layout、Style 级联、Package 生命周期、迁移、桥校验等）  
- 服从 Chrome MV3 CSP 与 runtime 边界（见 ADR-0002）  

## 10. 后置（不阻塞 v1 结构）

- 三套 Style Pack 视觉方向与 token 已写入 `DESIGN.md` 与 `docs/design/style-packs.md`；待 comps 审批与实现落地  
- monorepo 包名与目录树最终命名  
- 能力桥覆盖的 Chrome API schema 版本与生成子集清单  
- Hexagram 动爻高级模式（v1.1）  
- 用户自定义 Page Template、云同步、商店分发  

## 11. 相关文档

- 领域词表：[`CONTEXT.md`](../CONTEXT.md)  
- 产品事实：[`PRODUCT.md`](../PRODUCT.md)  
- ADR：[`docs/adr/`](./adr/)  
