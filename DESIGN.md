---
name: yindex
description: 统一液态玻璃 — 一扇窗：壁纸是世界，Widget 是浮在窗上的玻璃透镜
version: 2.1
supersedes: 三材质三联画 (v1, 2026-07-23)
colors:
  # Editor chrome (stable host UI, unchanged role)
  editor-bg: "oklch(0.16 0.008 260)"
  editor-surface: "oklch(0.22 0.01 260)"
  editor-ink: "oklch(0.94 0.01 260)"
  editor-muted: "oklch(0.72 0.02 260)"
  editor-line: "oklch(0.35 0.015 260)"
  editor-control-line: "oklch(0.58 0.015 260)"
  editor-accent: "oklch(0.62 0.14 36)"
  # Page seed light-fields (generative wallpaper color fields)
  moment-field: "晨光 · oklch hue 210→260, L 0.55–0.88"
  muse-field: "暖墨 · oklch hue 30→60, L 0.16–0.34"
  flow-field: "深海夜光 · oklch hue 240→290 + aurora 180/320, L 0.10–0.26"
typography:
  display-clock:
    fontFamily: "\"Noto Sans SC\", \"Source Han Sans SC\", system-ui, sans-serif"
    fontSize: "clamp(4.5rem, 14vw, 9rem)"
    fontWeight: 150
    lineHeight: 0.95
    letterSpacing: "-0.035em"
    fontVariantNumeric: "tabular-nums"
  display-quote:
    fontFamily: "\"Noto Serif SC\", \"Source Han Serif SC\", \"Songti SC\", serif"
    fontSize: "clamp(1.4rem, 3vw, 2.2rem)"
    fontWeight: 550
    lineHeight: 1.8
    letterSpacing: "0.03em"
  body:
    fontFamily: "\"Noto Sans SC\", \"Source Han Sans SC\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "\"Noto Sans SC\", system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 550
    lineHeight: 1.3
    letterSpacing: "0.07em"
  mono:
    fontFamily: "\"JetBrains Mono\", \"SF Mono\", ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  lens: "22px"
  lens-sm: "16px"
  capsule: "999px"
spacing:
  safe: "3%"
---

# Design System: yindex · 统一液态玻璃

**Status: approved direction · 2026-07-24 · ADR 0009 / 0010**

## Overview

**Creative North Star: "一扇窗 / Living Glass"**

每一页是一扇窗：**Wallpaper 是窗外的世界，Widget 是浮在窗上的玻璃透镜**。全产品只有一套液态玻璃物理（半透明、折射、边缘高光、流体响应），页与页的区别来自壁纸的光场、色调与字体气质——不是来自不同的材质系统。编辑器仍是石墨仪器面板，只向当前页借强调色。

**核心机制：第一眼就要成立**

- 玻璃是真透镜：背景被模糊、提亮、饱和地透过来，边缘有镜面高光与轻微折射，不是灰色半透明卡片
- 内容型信息（时钟、每日一句）**无壳直排**，像刻在壁纸上；工具型 Widget 才装进玻璃透镜
- 玻璃参数**自适应壁纸**（Adaptive Glass）：同一页换亮壁纸和暗壁纸，玻璃底色与文字色自动换挡，可读性由系统守底线
- 一切运动是弹簧与漂移，不是线性切换；`prefers-reduced-motion` 永远优先

**Key Characteristics:**

- 一套玻璃物理 × 三个光场世界（此刻 / 灵感 / 流光）
- 默认壁纸是**生成式动态壁纸**：本机实时渲染的缓慢流体光场，零资源体积、永远流动
- 编辑器 Restrained：石墨中性 + 单强调色 ≤10%（Borrowed Accent Rule 保留）
- 透明度三档（清透 / 均衡 / 沉静）+ 高级微调，默认即舒适

## Adaptive Glass（材质系统）

玻璃不是固定 `opacity`，而是一组随壁纸解析结果变化的参数。

### 壁纸解析

对当前 Wallpaper 采样（缩略图分析）：

- **平均亮度** L、**主色相/彩度** C、**细节密度**（边缘能量）
- 亮壁纸 → 玻璃用**深色调**（ink 基底的 tint），文字用浅色场
- 暗壁纸 → 玻璃用**浅色调**（white 基底的 tint），文字用深色场
- 高细节区域上的玻璃自动加深 scrim，守住正文对比 ≥ 4.5:1

### Glass Profile（三档）

| 档位 | blur | tint 不透明度 | 气质 |
|---|---|---|---|
| 清透 | 14–18px | 8–14% | 壁纸几乎完整透出，适合安静壁纸 |
| 均衡（默认） | 22–28px | 16–24% | Apple 默认感，任何壁纸都稳 |
| 沉静 | 30–40px | 28–40% | 厚重遮光，适合花壁纸/视频 |

高级微调（透光 / 模糊 / 饱和 / 高光）在档位上叠加，**系统可读性保护不可关闭**。

### 透镜构造（CSS 级）

- `backdrop-filter: blur(Npx) saturate(1.6–1.8) brightness(1.03–1.08)`
- 边缘镜面：顶部 1px 内高光（white 25–45%），全周 1px inset 描边（white 8–12%）
- 投影：仅 `0 12–32px / black 18–28%` 的浮起感，禁止 1px 边框 + 大软影的 AI 卡片套装
- 圆角：透镜 20–24px 连续圆角；胶囊 999px；≤16px 只用于小控件

## Colors

全产品无跨页主色。**色来自壁纸光场**；每页只有 seed 光场与 accent。

### Page 光场（生成式壁纸 seed）

- **此刻 · 晨光场**：hue 210→260，L 0.55–0.88，冷亮、低彩度，像清晨天窗
- **灵感 · 暖墨场**：hue 30→60，L 0.16–0.34，深暖底 + 朱砂/金微光
- **流光 · 深海夜光场**：hue 240→290 深底，aurora 光带（180 青 / 320 品红）缓慢漂移

### Accent

- 每页一个 accent：此刻 = 晨蓝 `oklch(0.62 0.10 240)`；灵感 = 朱砂 `oklch(0.55 0.18 28)`；流光 = 冷青 `oklch(0.78 0.08 200)`
- 编辑器只借 accent 与 ≤8% 环境 tint（Borrowed Accent Rule）
- 编辑器交互控件边界固定使用 `editor-control-line`；即使 Page accent 极端，仍须与最亮石墨控件底色保持 ≥3:1 非文本对比

### Content-direct 文字着色

无壳直排文字的颜色由 Adaptive Glass 同一套解析决定（亮壁纸深字、暗壁纸浅字），配 `0 1px 24px` 的柔光 scrim，不用硬阴影。

## Typography

- **时钟（内容直排）**：Noto Sans SC weight 100–200，`clamp(4.5rem, 14vw, 9rem)`，tabular-nums，tracking ≤ -0.03em
- **每日一句（内容直排）**：Noto Serif SC 550，`clamp(1.4rem, 3vw, 2.2rem)`，行高 1.8，略松 tracking
- **透镜内正文**：Noto Sans SC 15px / 1.55；阅读层（卦辞）16–17px，行宽 ≤ 48–60ch
- **Label**：11.5px / 0.07em / 550，用于胶囊、刻度、编辑器
- **Mono**：JetBrains Mono 13px，天气数字与坐标

**The One-Face-Per-Job Rule** 保留：同页 display 与 body 分工固定，不超过三套字族同屏。

## Layout

全视口画布；Widget 百分比定位；安全边距 3%。

### 此刻（Landing）

- 顶部居中：日期 + 天气胶囊（内容直排，label 级）
- 垂直中上：搜索透镜（宽 44–56vw，高 8–10vh，胶囊形）
- 底部：快捷方式玻璃架（一条横透镜，h 14–18vh，图标网格）
- 右缘：page dots

### 灵感

- 光学中上：每日一句（内容直排，serif，最大行宽 ~34ch）
- 中下或右侧：六十四卦玻璃透镜，默认收起为「今日一卦」摘要，点击展开卦库

### 流光

- 超大时钟内容直排，光学中心略高于几何中心
- 时钟下方一行日期 label；**几乎无其它 chrome**，生成式夜光壁纸占绝对主场

## Elevation & Depth

深度只来自三层：**壁纸（世界）→ 玻璃透镜（blur/tint/高光）→ 直排内容（柔光 scrim）**。禁止卡片投影堆叠、禁止 1px 边框 + 大软影。

## Motion

一套弹簧物理，三档强度，reduced-motion 永远优先。

| Profile | Page Turn | 高光漂移 | 视差 | 气质 |
|---|---|---|---|---|
| 舒缓 | 弹簧 ×0.7 速度 | 无 | 无 | 近乎静态 |
| 均衡（默认） | 弹簧标准 | 30–45s 慢循环 | 无 | Apple 默认 |
| 沉浸 | 弹簧 ×1.15 | 18–30s 循环 + 指针微响应 | ≤3% 视口 | 活窗 |

- Page Turn：滚轮速度感知，手势跟踪 + 弹簧落位（stiffness ~180 / damping ~26，无弹跳）
- 面板/透镜开合：形态衔接（高度/圆角/透明度联动），160–240ms，不瞬现
- 按压反馈：scale 0.97 / 120ms；编辑吸附线瞬现无缓动
- 动态壁纸本身以 20–60s 周期缓慢流动，内容层保持稳定
- reduced-motion：翻页改 120ms 淡入；动态/视频壁纸停为静态帧；高光漂移关闭
- 不可见页：视频暂停、生成式壁纸停渲染

## Do's and Don'ts

### Do

- **Do** 让玻璃真透出壁纸：blur + saturate + 边缘高光，而不是灰色蒙版
- **Do** 内容直排：时钟和每日一句不加壳
- **Do** 让 Adaptive Glass 兜底：任何壁纸上文字都可读
- **Do** 保持编辑器可预期：石墨壳，控件骨架不变
- **Do** 让默认生成式壁纸第一眼就成立，不依赖用户上传

### Don't

- **Don't** 每页发明独立材质系统（ADR 0009：一套玻璃物理）
- **Don't** 卡片墙：所有 Widget 装同款盒子
- **Don't** 弹跳/橡皮筋曲线、漂浮的 Widget、neon 描边
- **Don't** 编辑器跟随页面换字体或强模糊
- **Don't** 把透明度做成无保护的自由滑杆
- **Don't** 为「高级」牺牲对比度

## Widget 形态映射

| Widget | 形态 | 说明 |
|---|---|---|
| 时钟 | 内容直排 | weight 100–200 超大字 |
| 每日一句 | 内容直排 | serif，柔光 scrim |
| 搜索 | 玻璃透镜（胶囊） | Landing 主角 |
| 快捷方式 | 玻璃透镜（横架） | 图标网格 |
| 天气 | 玻璃透镜（胶囊） | 轻量信息 |
| 六十四卦 | 玻璃透镜（面板） | 收起=今日一卦，展开=卦库 |

形态由类型决定，用户不可切换有壳/无壳。

## Direction contract（系统级）

- **THESIS:** 一扇窗：壁纸是世界，玻璃是窗，Widget 是窗上的透镜。
- **OWN-WORLD:** 一套玻璃物理 × 三个光场（晨光 / 暖墨 / 深海夜光）+ 石墨编辑器壳。
- **STORY:** 打开即在「此刻」开工，上滑入「灵感」阅读，下滑入「流光」沉浸；编辑时永不迷路。
- **FIRST VIEWPORT:** 此刻 = 晨光生成式壁纸 + 中央搜索透镜 + 中央图标网格 + 顶部日期天气胶囊。
- **FORM:** 统一液态玻璃（ADR 0009）；staging = 纵向换景。

---

## v2.1 修订 · iTab 级执行精度（2026-08-06）

方向不变（Living Glass / ADR 0009 不推翻），升级的是**执行精度**：吸收 iTab 的栅格纪律与图标工艺，交叉进液态玻璃母语。

### MOMENT 构图（取代 Layout 章节的旧三段）

- 顶部居中：日期 + 天气胶囊（内容直排，label 级）
- 中上：搜索透镜（宽 44–56vw，胶囊形）
- **中央：图标网格是页面主角**——Shortcut 直接以玻璃 squircle 浮在壁纸上，**不再有底部横架/架子外壳**；底部保持留白

### Shortcut 图标系统

- **图标块**：~64px 玻璃 squircle（同一套玻璃物理：blur + tint + 顶部高光），favicon ~32–36px 居中，下方 12px 标签，颜色由 Adaptive Glass 决定；hover 轻微 scale + 高光增强
- **图标来源**：Chrome `_favicon` 本地机制（需 `favicon` 权限），零网络外泄、离线可用；未缓存站点用字母 fallback（squircle + 首字符 + 域名哈希柔和底色）
- **Shortcut Folder**：与普通 Shortcut 同格并列；闭合态显示 2×2 迷你图标预览；点击就地弹出浮层网格（scrim + spring），Esc/点外收起；只许一层、只装 Shortcut（见 CONTEXT.md）

### 生成式壁纸渲染升级

- 光场改为**大尺度、低频率的柔和光斑渐变**（有光源方向与体积感），噪点降为极轻胶片颗粒
- 晨光场：上亮下沉，像天窗；暖墨场：深暖底 + 朱砂/金微光要可辨；深海夜光场：aurora 光带必须可见，不再是近纯黑

### MUSE 回归设计稿

- 每日一句：光学中上（v2.0 原文），实现从左上偏位移回
- 六十四卦：**白色死卡片废除**，改为玻璃透镜（LensSurface 同一物理）；收起 = 今日一卦摘要，点击展开卦库

### 内置演示壁纸（2026-08-07）

首次启动时，扩展把内置的「蓝天白云」演示图（`public/wallpapers/blue-skies.jpg`，程序化生成、无版权素材）播种进本地媒体库，并设为「此刻」的默认 Wallpaper——落地页第一眼就是真实照片级画面，Adaptive Glass 基于真实像素分析。播种失败（OPFS 不可用等）自动回退生成式晨光场。生成式三光场保留在灵感/流光页与壁纸目录中。

### 玻璃极性修正（2026-08-07）

原规则「亮壁纸 → 深色玻璃 + 浅字 / 暗壁纸 → 浅色玻璃 + 深字」在实践中被对比度安全循环推成 82% 不透明蒙版（亮壁纸出黑板、暗壁纸出白卡），破坏液态玻璃的通透感。**修正为 iOS 式同向极性：亮壁纸 → 浅色玻璃 + 深字；暗壁纸 → 深色玻璃 + 浅字**——tint 方向与壁纸一致，安全 scrim 保持轻薄（实测亮场 ~7%、暗场 ~38%），4.5:1 文字对比底线不变。图标块（Shortcut Tile）不绘制 scrim（承载图标而非正文），只保留 blur + tint + 顶部高光 + 内上光。

### 第二轮（暂缓）

编辑态 chrome 专项治理：玻璃叠层串色、对比度、控件统一、对齐网格。
