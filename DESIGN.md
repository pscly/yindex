---
name: yindex
description: 三材质三联画 — 墨石 · 卡尺 · 露珠，加石墨编辑器壳
colors:
  # Editor chrome (stable host UI)
  editor-bg: "oklch(0.16 0.008 260)"
  editor-surface: "oklch(0.22 0.01 260)"
  editor-ink: "oklch(0.94 0.01 260)"
  editor-muted: "oklch(0.72 0.02 260)"
  editor-line: "oklch(0.35 0.015 260)"
  editor-accent: "oklch(0.62 0.14 36)"
  # Knowledge · Inkstone
  inkstone-bg: "oklch(0.18 0.02 70)"
  inkstone-surface: "oklch(0.24 0.025 65)"
  inkstone-ink: "oklch(0.93 0.02 80)"
  inkstone-muted: "oklch(0.72 0.03 75)"
  inkstone-accent: "oklch(0.55 0.18 28)"
  inkstone-gold: "oklch(0.78 0.08 85)"
  # Launch · Caliper
  caliper-bg: "oklch(0.97 0.005 250)"
  caliper-surface: "oklch(1 0 0)"
  caliper-ink: "oklch(0.22 0.02 250)"
  caliper-muted: "oklch(0.48 0.02 250)"
  caliper-accent: "oklch(0.52 0.12 250)"
  caliper-warn: "oklch(0.62 0.14 36)"
  # Atmosphere · Dew Glass
  dew-bg: "oklch(0.12 0.03 250)"
  dew-surface: "oklch(0.22 0.04 240 / 0.45)"
  dew-ink: "oklch(0.96 0.01 240)"
  dew-muted: "oklch(0.78 0.03 230)"
  dew-accent: "oklch(0.78 0.08 200)"
  dew-glow: "oklch(0.85 0.06 40)"
typography:
  display-knowledge:
    fontFamily: "\"Noto Serif SC\", \"Source Han Serif SC\", \"Songti SC\", serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.02em"
  display-atmosphere:
    fontFamily: "\"Noto Sans SC\", \"Source Han Sans SC\", system-ui, sans-serif"
    fontSize: "clamp(4rem, 12vw, 7.5rem)"
    fontWeight: 200
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  body:
    fontFamily: "\"Noto Sans SC\", \"Source Han Sans SC\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "\"Noto Sans SC\", system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.04em"
  mono:
    fontFamily: "\"JetBrains Mono\", \"SF Mono\", ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  safe: "3%"
components:
  editor-button-primary:
    backgroundColor: "{colors.editor-accent}"
    textColor: "oklch(0.99 0 0)"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  editor-panel:
    backgroundColor: "{colors.editor-surface}"
    textColor: "{colors.editor-ink}"
    rounded: "{rounded.md}"
    padding: "12px"
  widget-chrome-caliper:
    backgroundColor: "{colors.caliper-surface}"
    textColor: "{colors.caliper-ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  widget-chrome-inkstone:
    backgroundColor: "{colors.inkstone-surface}"
    textColor: "{colors.inkstone-ink}"
    rounded: "{rounded.sm}"
    padding: "16px"
  widget-chrome-dew:
    backgroundColor: "{colors.dew-surface}"
    textColor: "{colors.dew-ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: yindex

## Overview

**Status: approved** · 2026-07-23 · comps 见 `docs/design/comps/`

**Creative North Star: "三材质三联画 / Three Materials Triptych"**

yindex 的视觉身份不是「一套主题换色」，而是 **三张全屏材质场景 + 一套永不失忆的编辑器壳**。用户纵向 Page Turn 时，像在墨石拓印台、卡尺工程台、夜窗露珠玻璃之间换场景；编辑器始终是石墨仪器面板，只向当前页借强调色与极淡环境染色。

机制要在第一眼成立：相邻页必须 **字体、色场、材质、构图语言** 同时换，而不能只换壁纸。Liquid Glass 是氛围页的母语，不是全产品默认装饰。知识页拒绝「米黄宣纸 + 衬线」训练数据默认；用 **深墨石 + 朱砂印 + 金线** 承载典籍气质。

**Key Characteristics:**

- 三 Page = 三完整视觉世界；共享的只有 Page Turn、点指示器、编辑器结构
- 编辑器 Restrained：石墨中性 + 单强调色 ≤10%
- 知识 Committed：朱砂与金线在深石上少量高能
- 启动 Restrained 亮工具：高对比、低装饰、刻度感
- 氛围 Drenched 暗场：露珠玻璃与大时钟占场
- 对比与键盘路径优先于特效；`prefers-reduced-motion` 降级位移与视频

## Colors

调色以 **材质场** 为单位，不用跨页统一主色。品牌种子色相约 36°（暖朱/赤陶）主要落在 **知识页朱砂** 与 **编辑器强调色**，启动页用冷钢蓝形成跨页对照。

### Editor · Graphite Chassis

- **Editor Bg** `oklch(0.16 0.008 260)`：侧栏/工具条底
- **Editor Surface** `oklch(0.22 0.01 260)`：面板
- **Editor Ink / Muted**：正文与次要字
- **Editor Accent** `oklch(0.62 0.14 36)`：主操作、选中框；可被当前 Page 的 accent **替换染色**（半跟随）

**The Borrowed Accent Rule.** 编辑器只借当前 Page 的 `accent` 与 ≤8% 环境 tint；不借 display 字体、不借 glass 模糊、不借壁纸。

### Knowledge · Inkstone（知识·典籍）

- **Inkstone Bg** `oklch(0.18 0.02 70)`：深石/墨池，非 cream
- **Inkstone Surface** `oklch(0.24 0.025 65)`：卦表/卡片抬升一层
- **Ink** 浅暖墨白；**Muted** 偏石灰
- **Cinnabar Accent** `oklch(0.55 0.18 28)`：印、焦点卦、主 CTA
- **Gold Line** `oklch(0.78 0.08 85)`：细线、网格弱参考、装饰边

**The No-Cream-Scripture Rule.** 禁止用近白暖米色当知识页主底来「显得有文化」。

### Launch · Caliper（启动·精密工具）

- **Caliper Bg** `oklch(0.97 0.005 250)`：近冷白工具台
- **Surface** 纯白 `oklch(1 0 0)` 卡片
- **Ink** 冷深灰；**Accent** 钢蓝 `oklch(0.52 0.12 250)`
- **Warn** 借用种子暖色作天气告警等语义，不装饰铺底

**The Zero-Ornament Workbench Rule.** 启动页装饰线 ≤1px；禁止大面积玻璃与发光边。

### Atmosphere · Dew Glass（氛围·沉浸光雾）

- **Dew Bg** `oklch(0.12 0.03 250)`：夜窗深底
- **Dew Surface** 半透明 `oklch(0.22 0.04 240 / 0.45)` + blur
- **Ink** 近白；**Accent/Glow** 冷青与暖高光并存，高光用于时钟边缘与玻璃折射

**The Glass-Is-Atmosphere Rule.** 液态玻璃默认只在此 Pack 强开；其它 Pack 的 `glass.*` 默认接近关闭。

## Typography

**Knowledge Display:** Noto Serif SC / Source Han Serif SC  
**Body / UI:** Noto Sans SC / Source Han Sans SC  
**Atmosphere Display (clock):** Noto Sans SC weight 200，超大号  
**Mono / data:** JetBrains Mono（天气数字、坐标、调试）

**Character:** 中文场景以字族分工而不是拉丁装饰字体；页间换 **字阶与字重气质**，不是换一套网红英文字。

### Hierarchy

- **Atmosphere Clock** — weight 200，`clamp(4rem, 12vw, 7.5rem)`，letter-spacing ≥ -0.03em  
- **Knowledge Title** — Serif 600，约 1.75–2.5rem，略松 tracking  
- **Launch Title / Search** — Sans 500–600，紧凑、工具感  
- **Body** — 15px / 1.55；阅读层（卦辞）可 16–17px，最大行宽 ~48–60ch 中文  
- **Label** — 12px，轻微 tracking，用于编辑器与刻度标签  
- **Mono** — 13px，天气、时间秒、调试日志  

**The One-Face-Per-Job Rule.** 同一 Page 内 display 与 body 分工固定；禁止三套以上字族同屏。

## Layout

- 全视口画布；Widget 百分比定位；安全边距约 **3%** 视口
- **Landing（启动）首屏构图：**  
  - 垂直中上：搜索条（宽约 42–56% vw，高约 7–9% vh）  
  - 其下：快捷方式网格（约 3–5 列）  
  - 右上或左上：天气紧凑块  
  - 侧边 dots 距右缘 ~12–16px  
- **知识页：** 左/中大块 Hexagram Board；上或侧每日一句横卷；避免居中一张「卡片墙」  
- **氛围页：** 时钟光学中心略高于几何中心；几乎无边框噪声；Wallpaper 全出血  
- 编辑态：右侧或左侧 **280–320px** 侧栏；画布缩进；选中框 1–2px 实线用 borrowed accent  
- Snap 参考线：编辑器色，不跟 Page 材质

## Elevation & Depth

- **Editor / Launch:** 几乎 flat；用 1px 线与微弱 tonal 分层，shadow blur ≤ 8px 且不与 1px border 同用宽软影  
- **Knowledge:** 浅石层叠 + 细金线，无大投影  
- **Atmosphere:** 深度来自 **blur / 半透明 / 高光**，不是卡片投影  

**The No-Ghost-Card Rule.** 禁止 `1px solid` + 大 soft drop-shadow 的 AI 卡片套装。

## Shapes

- Editor / Launch radius: **6–10px**  
- Knowledge: **6px** 或直角偏多（碑帖块面）  
- Atmosphere glass: **12–14px**（唯一允许偏圆，仍 ≤14px）  
- 禁止 24px+ 大圆角卡片  
- 控件形态跨页由 **编辑器** 统一；Page 只改材质与色，不改「开关长什么样」的骨架

## Components

### Editor chrome

- **Edit 按钮 / 工具条：** 石墨底，accent 主按钮，白字  
- **选中框：** 2px solid borrowed accent；resize handle 方形 6–8px  
- **Snap 线：** 1px accent 50% 透明  
- **Page dots：** 空心/实心圆 6px；当前页实心；默认 Landing 可小横杠标记  

### Widget shell

- **Caliper shell:** 白底、1px 冷灰线、无 blur  
- **Inkstone shell:** 深石面、朱砂细边或顶线、金线分隔  
- **Dew shell:** 半透明 + `backdrop-filter` blur 16–28px；内高光 1px  

### Buttons（画布内）

- Primary 使用 **当前 Page accent**，饱和填充上 **白字**  
- Ghost：1px 边 + 透明底  
- 危险操作：语义红，仅 Settings/确认框  

### Inputs

- Launch 搜索：大圆角不超过 pill 的 999 全高；高对比 placeholder（≥4.5:1）  
- 焦点环：2px accent offset，不靠 glow 堆叠  

### Hexagram Board

- 矩阵：等宽格子、细线；悬停抬升一层 surface；焦点卦朱砂边  
- 每日抽卦：仪式按钮用朱砂；结果区 serif 标题 + sans 正文  

### Page Turn

- 默认：纵向整页 `transform` 平移 280–360ms，ease-out-quint  
- reduced-motion：120ms 淡入或瞬切  
- 不可见页 Wallpaper 视频暂停  

## Motion

| Token | Value | Use |
|---|---|---|
| ease-out-expo | `cubic-bezier(0.16, 1, 0.3, 1)` | Page Turn、面板 |
| duration-turn | 320ms | 翻页 |
| duration-ui | 160–200ms | 按钮/侧栏 |
| glass-shimmer | optional, atmosphere only | 高光缓慢漂移，可关 |

禁止弹跳/弹性曲线。编辑吸附线可瞬时出现无缓动。

## Do's and Don'ts

### Do

- **Do** 让相邻 Page 在色场、字体角色、材质上同时换挡  
- **Do** 保持编辑器可预期：同一套控件骨架  
- **Do** 氛围页把液态玻璃做满；其它页默认克制  
- **Do** 知识页用深石与朱砂建立「典籍」而不是文具店小清新  
- **Do** 启动页保持工具台可读：搜索与快捷方式 1 秒可点  

### Don't

- **Don't** 三页共用同一玻璃卡片皮肤只换壁纸  
- **Don't** 知识页 cream/sand 主底 + 泛衬线英雄字  
- **Don't** 全站 neon 赛博边框或统一紫粉渐变字  
- **Don't** 编辑器跟随 Page 更换字体或强模糊  
- **Don't** 用装饰网格/斜纹当壁纸替代真实构图  
- **Don't** 为「高级」把启动页对比做糊  

## Style Pack 映射

| Pack ID | 中文名 | 策略 | 主场景 |
|---|---|---|---|
| `inkstone` | 知识·典籍 | Committed 深场 | 知识页 |
| `caliper` | 启动·精密工具 | Restrained 亮场 | 启动 Landing |
| `dew-glass` | 氛围·沉浸光雾 | Drenched 暗场 + glass | 氛围页 |
| `editor-graphite` | 编辑器壳 | Restrained | Edit/Settings/chrome |

详细 token 与首屏构图见 `docs/design/style-packs.md`。

## Direction contract（系统级）

- **THESIS:** 可循环的全屏材质场景序列，拒绝「一个仪表盘换肤」。  
- **OWN-WORLD:** 墨石 / 卡尺 / 露珠 + 石墨壳，四套可识别空状态仍成立的材质语言。  
- **STORY:** 用户打开即在精密启动台开工，上滑入典籍，下滑入光雾；编辑时永不迷路。  
- **FIRST VIEWPORT:** Landing = 卡尺工程台：搜索中上、快捷方式网格、天气一角、右侧 dots。  
- **FORM:** 三材质三联画（concept seed key `6146d2df`，assigned index 7）；staging = 纵向换景，非 light-table。  
