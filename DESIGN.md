---
name: yindex
description: 统一液态玻璃 — 一扇窗：壁纸是世界，Widget 是浮在窗上的玻璃透镜
version: 2.0
supersedes: 三材质三联画 (v1, 2026-07-23)
colors:
  # Editor chrome (stable host UI, unchanged role)
  editor-bg: "oklch(0.16 0.008 260)"
  editor-surface: "oklch(0.22 0.01 260)"
  editor-ink: "oklch(0.94 0.01 260)"
  editor-muted: "oklch(0.72 0.02 260)"
  editor-line: "oklch(0.35 0.015 260)"
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
- **FIRST VIEWPORT:** 此刻 = 晨光生成式壁纸 + 中央搜索透镜 + 底部快捷架 + 顶部日期天气胶囊。
- **FORM:** 统一液态玻璃（ADR 0009）；staging = 纵向换景。
