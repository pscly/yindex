# yindex v0.2 产品规格（当前）

> 本文描述当前 v0.2 产品与实现边界。领域词汇以 [`CONTEXT.md`](../CONTEXT.md) 为准，视觉规则以 [`DESIGN.md`](../DESIGN.md) v0.2 为准，架构取舍以 [`docs/adr/`](./adr/) 为准。

## 1. 产品定义

yindex 是接管 **Chrome 新标签页** 的可组装 **Home**。Home 由有序 **Page Sequence** 构成；每个 **Page** 是一张拥有独立 **Style**、**Wallpaper**、**Layout** 与 **Widget Instance** 的全屏画布。用户以纵向 **Page Turn** 在相邻 Page 间切换，序列首尾 **Loop**。

### 1.1 用户与分发

| 项 | 当前决策 |
|---|---|
| 首批用户 | 作者本人与开发者朋友 |
| 浏览器 | Chrome 120+，Manifest V3 |
| 安装 | GitHub Release zip 解压后，以开发者模式加载固定 `yindex-extension/` 文件夹 |
| 更新 | 用新 Release 覆盖 Chrome 已加载的同一 `yindex-extension/` 文件夹，再点「重新加载」 |
| 打包输出 | `release/yindex-extension/` 与 `release/yindex-extension-vX.Y.Z.zip` |
| 语言 | 产品 UI 仅中文；Hexagram 经典原文保持传统文本 |
| 账号/云 | 无自建账号与云同步；配置与资源仅留在本机 |

GitHub 自动生成的源码 zip 不是可加载产物。完整步骤见 [`INSTALL.md`](../INSTALL.md)。

### 1.2 v0.1.x 兼容边界

v0.1.x 是内部开发快照，不构成兼容承诺。v0.2 可以替换旧 Home schema、默认 Page Sequence、Style 系统、Wallpaper 引用与迁移代码；旧配置导出不得导入 v0.2。用户应清除旧本地数据并全新安装 v0.2。见 [ADR 0010](./adr/0010-no-backward-compatibility-before-public-release.md)。

### 1.3 v0.2 验收线

1. 默认 **此刻 / 灵感 / 流光** 三个 Page，可纵向循环翻页
2. 所有 Page 共用统一 Liquid Glass；Adaptive Glass 根据 Wallpaper 自动保护可读性
3. 可编辑 Page Layout、Style、Glass Profile 与 Wallpaper
4. 首发内置 Widget 可实际使用
5. 可导入并运行至少一个第三方示例 Widget Package（番茄钟 / 专注计时）
6. 关闭并重新打开新标签页后，Home 配置、本地 Wallpaper 与 Package 资源仍然存在

## 2. Page 与导航

- Page Sequence：有序、可增删、复制与重排；至少一个 Page
- Page 元数据：用户可编辑名称与图标
- 新建可选：空白 Page、MOMENT、MUSE、FLOW 或复制当前 Page
- Page Turn：整页纵向切换，不是连续长页滚动
- Loop：末页下一页为首页，首页上一页为末页
- Landing：默认固定为「此刻」；Settings 可改为记住上次所在 Page
- 指示器：右侧点状指示器，可点击跳转
- 滚轮：悬停可滚动 Widget 时优先交给 Widget，否则触发 Page Turn；累积阈值、冷却与惯性抑制防止连翻
- Edit Mode 禁用滚轮翻页
- 键盘：↑↓ 或 PageUp/PageDown 翻相邻 Page；数字 1 到 9 跳序号；Esc 关闭全屏层
- reduced-motion：Page Turn 使用 120ms 淡入；动态/视频 Wallpaper 停为静态帧；非必要高光漂移关闭

### 2.1 默认三个 Page

| 顺序 | Page | Style Pack | Wallpaper 光场 | 默认内容 |
|---|---|---|---|---|
| 1（Landing） | 此刻 | MOMENT | 晨光 | 日期天气、搜索、快捷方式 |
| 2 | 灵感 | MUSE | 暖墨 | 每日一句、Hexagram Board |
| 3 | 流光 | FLOW | 深海夜光 | 大时钟与日期 |

三个 Page 共用同一套 Liquid Glass 材质系统。它们通过生成式 Wallpaper、seed palette、字体气质与构图区分，而不是各自定义材质系统。

## 3. Layout

- 坐标系：相对视口百分比 `x / y / w / h` 与显式 `z`
- 自由定位；Edit Mode 支持拖放、缩放与 Snap
- Snap 参考：安全边距、逻辑网格、其他 Widget 边/中心、三分线与黄金分割线；按住 Alt/Option 临时关闭
- 允许重叠；支持多选、对齐、分布与统一尺寸；不支持旋转
- 编辑后矩形必须留在 Page 安全区；窗口变化时保留百分比并执行最小尺寸与边界修正
- 同一 Widget Type 可在同一 Page 上存在多个 Instance，各自保有配置与 Layout
- 键盘可选择、移动与缩放 Widget，作为指针拖拽的等价路径

## 4. Style、Wallpaper 与 Liquid Glass

### 4.1 Style Pack

- Style 属于 Page；MOMENT / MUSE / FLOW 是首发 Style Pack
- 应用 Pack 会替换 Page 的 seed palette、生成式 Wallpaper preset、字体气质与基础 Glass Profile
- Widget 默认继承 Page tokens；Instance 只可覆盖颜色、字体、间距、圆角与 elevation 等安全字段
- Glass 材质不允许被 Instance 覆盖或关闭；系统可读性保护不可绕过
- 详细 token 见 [`docs/design/style-packs.md`](./design/style-packs.md)

### 4.2 Unified Liquid Glass

- Liquid Glass 是全产品默认材质语言：半透明 tint、背景 blur/saturation/brightness、边缘高光与受控投影
- 内容型信息可使用 Content Direct（如大时钟、每日一句），工具型 Widget 使用 panel / capsule / shelf 玻璃透镜
- 所有透镜由同一材质解析器生成；Page 不拥有独立材质体系
- Adaptive Glass 读取 Wallpaper 平均亮度、主色/彩度与细节密度，选择前景极性并增加必要 scrim
- 正文对比底线为 4.5:1；关键非文本控件为 3:1

### 4.3 Glass Profile

| 档位 | blur | tint 不透明度 | 用途 |
|---|---|---|---|
| 清透 | 14px 至 18px | 8% 至 14% | 安静、低细节 Wallpaper |
| 均衡（默认） | 22px 至 28px | 16% 至 24% | 通用、安全的默认状态 |
| 沉静 | 30px 至 40px | 28% 至 40% | 高细节图片或视频 Wallpaper |

Settings 中可对透光、模糊、饱和与高光做受限高级微调；最终输出仍须落在所选档位和可读性边界内。

### 4.4 Wallpaper

- 每个 Page 独立拥有 Wallpaper；Wallpaper 不是普通 Widget
- 默认使用本机实时渲染的 Generative Wallpaper：`moment` / `muse` / `flow`
- 用户可导入本地图片或短循环视频；不支持远程视频流
- 本地媒体导入验证扩展名、声明 MIME、字节签名与大小；视频上限 100 MiB，图片仍受浏览器可用存储与解码能力约束
- 仅可见 Page 播放视频或渲染生成式 Wallpaper；离开时暂停；reduced-motion 时显示静态帧
- Settings 提供 Wallpaper 资源占用、引用提示和删除；仍被 Page 引用的资源不可删除

## 5. 模式与编辑

| 模式 | 职责 |
|---|---|
| Browse Mode | Page Turn 与 Widget 交互 |
| Edit Mode | Layout、Style、Widget 与 Page Sequence；主入口为「编辑」 |
| Settings | Glass Profile、高级玻璃微调、导航、Widget Catalog、Wallpaper 资源、重置与导入导出 |

- 编辑实时自动保存，并提供会话内撤销/重做
- 侧栏管理当前 Page 的属性、顺序、Widget 与 Wallpaper
- Overview 提供全 Page 缩略、跳转、拖拽重排、复制与删除
- 编辑器结构和控件语义稳定；使用石墨壳，只借当前 Page accent 与最多 8% 环境 tint
- 编辑器字体、文字色、语义色和交互边界不跟随 Page Style 任意变化

## 6. 内置 Widget

### 6.1 运行时划分

| 路径 | Widget |
|---|---|
| 宿主 React 树 | 日期时钟、搜索、快捷方式、每日一句、天气、Hexagram Board |
| SDK + sandbox | 番茄钟示例与第三方 Widget Package |

### 6.2 行为摘要

- **日期时钟**：此刻使用紧凑日期伴随形态；流光使用超大 Content Direct 时钟
- **搜索**：可选引擎，默认 Google；可自定义搜索 URL
- **天气**：默认 Open-Meteo；支持定位或手动城市
- **快捷方式**：独立启动台列表；可从 Chrome 书签导入
- **每日一句**：默认 Hitokoto；支持自定义源、刷新周期、手动刷新与失败缓存
- **Hexagram Board**：8×8 上下卦矩阵；每日手动抽本卦；展示公版卦辞/象传与项目简注；不做个性化吉凶断言

## 7. 第三方 Widget Package

- 导入：本地 zip 或目录
- 信任：导入即高度信任其经能力桥获得的授权；sandbox 是执行边界，不代表无能力
- 每个 Instance 使用独立 sandbox iframe；不可见时默认挂起，邻页可预热
- 故障使用 Instance 级占位，提供重试、禁用、日志与移除
- 身份：`packageId` + semver；一包可定义多个 Widget Type
- Manifest 至少声明 `packageId`、`name`、`version`、`engines`、`yindexApiVersion`、`types[]` 与 `permissions[]`
- 权限由包声明并在导入时授权；未声明或未授权请求由能力桥拒绝
- 升级失败回滚；卸载保留 Missing Widget、配置与 Layout，重装相同 `packageId` 后恢复
- 示例验收包：番茄钟 / 专注计时

## 8. 数据、权限与恢复

| 数据 | 本机存储 |
|---|---|
| Home / Page / Widget 结构化配置 | `chrome.storage` |
| Widget Package 资源 | IndexedDB |
| 图片与视频 Wallpaper | OPFS |

- Manifest 声明 `unlimitedStorage`，降低大型本地 Wallpaper 与 Package 资源受到常规配额阻断的风险；实际可用容量仍受设备空间与 Chrome 策略限制
- 根 `schemaVersion = 2`；导入先做严格 schema 校验，失败不覆盖当前 Home
- 默认轻量 JSON 导出包含 Home 配置与引用，不包含 OPFS 媒体或 Widget Package 文件
- 启动时检查媒体引用完整性；缺失媒体使用安全占位
- 「恢复默认主页」只重写 Home，保留 Wallpaper 与 Package
- 「完全清除」依次清除 OPFS 媒体、Package 存储和 Home，再恢复默认三个 Page
- 暖启动目标：已有本地配置时，Landing 首屏可交互 < 300ms

## 9. 工程与安全方向

- Vite + React + TypeScript；Bun workspace + Vite multi-entry
- Chrome MV3 CSP；Extension 代码、字体与 Worker 随包分发，不依赖远程可执行脚本
- 关键 Domain、存储、Widget Package 与浏览器主路径使用自动化测试
- 包产物由 `scripts/pack-extension.sh` 生成；固定可加载目录为 `release/yindex-extension/`
- Page 主路径键盘可达、焦点可见、Settings 焦点受控；以 WCAG 2.2 AA 自检

## 10. 后置范围

- Hexagram 动爻、变卦与爻辞高级模式
- 用户保存或分享自定义 Page Template
- 云同步与账号系统
- Chrome Web Store 分发
- 在线 Widget Store；首发仅有本地 Widget Catalog

## 11. 相关文档

- 用户入口：[`README.md`](../README.md)
- 安装：[`INSTALL.md`](../INSTALL.md)
- 领域词表：[`CONTEXT.md`](../CONTEXT.md)
- 产品事实：[`PRODUCT.md`](../PRODUCT.md)
- 设计系统：[`DESIGN.md`](../DESIGN.md)
- Style Pack：[`docs/design/style-packs.md`](./design/style-packs.md)
- ADR：[`docs/adr/`](./adr/)
