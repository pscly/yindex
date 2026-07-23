# 首发 Style Packs 细则

对应 `DESIGN.md` 的三材质三联画。下列 token 为 v1 默认值；用户深度自定义可覆盖 Page 级字段。

## 公共 token 形状

```ts
type StyleTokens = {
  color: {
    bg: string
    surface: string
    ink: string
    muted: string
    accent: string
    // pack-specific extras allowed
    [key: string]: string
  }
  typography: {
    displayFamily: string
    bodyFamily: string
    monoFamily: string
    displayWeight: number
    bodySizePx: number
  }
  space: { safePct: number; widgetGapPct: number }
  radius: { sm: string; md: string; lg: string }
  elevation: { mode: 'flat' | 'tonal' | 'glass' }
  glass: {
    blurPx: number
    opacity: number
    highlight: number // 0–1
    enabled: boolean
  }
  wallpaper: {
    kind: 'image' | 'video' | 'gradient' | 'generative'
    fit: 'cover'
    dim: number // 0–1 overlay to protect text
  }
  motion: {
    turnMs: number
    ease: string
  }
}
```

## `inkstone` · 知识·典籍

| 字段 | 值 |
|---|---|
| color.bg | `oklch(0.18 0.02 70)` |
| color.surface | `oklch(0.24 0.025 65)` |
| color.ink | `oklch(0.93 0.02 80)` |
| color.muted | `oklch(0.72 0.03 75)` |
| color.accent | `oklch(0.55 0.18 28)` 朱砂 |
| color.gold | `oklch(0.78 0.08 85)` |
| typography.displayFamily | Noto Serif SC |
| typography.bodyFamily | Noto Sans SC |
| glass.enabled | false（blur 0） |
| elevation.mode | tonal |
| wallpaper | 深石纹理或暗拓印；dim 0.25–0.4 |
| 默认构图 | 中左：Hexagram 矩阵；上/侧：每日一句横卷 |

## `caliper` · 启动·精密工具

| 字段 | 值 |
|---|---|
| color.bg | `oklch(0.97 0.005 250)` |
| color.surface | `oklch(1 0 0)` |
| color.ink | `oklch(0.22 0.02 250)` |
| color.muted | `oklch(0.48 0.02 250)` |
| color.accent | `oklch(0.52 0.12 250)` 钢蓝 |
| color.warn | `oklch(0.62 0.14 36)` |
| typography.displayFamily | Noto Sans SC |
| glass.enabled | false |
| elevation.mode | flat |
| wallpaper | 冷灰微渐变或极淡工程网格（非装饰斜纹）；dim 0 |
| 默认构图 | 搜索中上；快捷方式其下；天气角落 |

## `dew-glass` · 氛围·沉浸光雾

| 字段 | 值 |
|---|---|
| color.bg | `oklch(0.12 0.03 250)` |
| color.surface | `oklch(0.22 0.04 240 / 0.45)` |
| color.ink | `oklch(0.96 0.01 240)` |
| color.muted | `oklch(0.78 0.03 230)` |
| color.accent | `oklch(0.78 0.08 200)` |
| color.glow | `oklch(0.85 0.06 40)` |
| typography.displayFamily | Noto Sans SC weight 200 |
| glass.enabled | true |
| glass.blurPx | 20–28 |
| glass.opacity | 0.4–0.55 |
| glass.highlight | 0.35 |
| elevation.mode | glass |
| wallpaper | 夜景静图/短循环视频/雾光 generative；dim 0.15–0.3 |
| 默认构图 | 大时钟光学中心偏上；少即是多 |

## `editor-graphite` · 编辑器壳

| 字段 | 值 |
|---|---|
| color.bg | `oklch(0.16 0.008 260)` |
| color.surface | `oklch(0.22 0.01 260)` |
| color.ink | `oklch(0.94 0.01 260)` |
| color.muted | `oklch(0.72 0.02 260)` |
| color.accent | 默认 `oklch(0.62 0.14 36)`，运行时 = 当前 Page accent |
| typography | Noto Sans SC + JetBrains Mono |
| glass | 关闭 |
| 半跟随 | 仅 accent + ≤8% 环境 tint；Light/Dark 跟系统 |

## 跨 Pack 不变量

1. 正文 vs 主底对比：亮场 ≥4.5:1，暗场 ≥4.5:1（目标 7:1 更佳）  
2. 主按钮：饱和 accent 上白字  
3. radius 上限 14px  
4. Page Turn 320ms；reduced-motion 淡入/瞬切  
5. Widget Instance 可覆盖个别 color/radius/glass；换 Pack 保留 override  
