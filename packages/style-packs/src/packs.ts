import type { StylePackId, StyleTokens } from "@yindex/domain"
import { stylePackId } from "@yindex/domain"

export type StylePackDefinition = {
  readonly id: StylePackId
  readonly name: string
  readonly description: string
  readonly tokens: StyleTokens
}

const mono = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"

export const INKSTONE: StylePackDefinition = {
  id: stylePackId("inkstone"),
  name: "知识·典籍",
  description: "墨石朱砂，典籍气质",
  tokens: {
    color: {
      bg: "oklch(0.18 0.02 70)",
      surface: "oklch(0.24 0.025 65)",
      ink: "oklch(0.93 0.02 80)",
      muted: "oklch(0.72 0.03 75)",
      accent: "oklch(0.55 0.18 28)",
      gold: "oklch(0.78 0.08 85)",
    },
    typography: {
      displayFamily: '"Noto Serif SC", "Songti SC", serif',
      bodyFamily: '"Noto Sans SC", "PingFang SC", sans-serif',
      monoFamily: mono,
      displayWeight: 600,
      bodySizePx: 15,
    },
    space: { safePct: 2, widgetGapPct: 1.5 },
    radius: { sm: "4px", md: "8px", lg: "12px" },
    elevation: { mode: "tonal" },
    glass: { blurPx: 0, opacity: 0, highlight: 0, enabled: false },
    wallpaper: {
      kind: "gradient",
      fit: "cover",
      dim: 0.3,
      value:
        "radial-gradient(ellipse at 30% 20%, oklch(0.28 0.03 65), oklch(0.16 0.02 70) 70%)",
    },
    motion: { turnMs: 480, ease: "cubic-bezier(0.22, 1, 0.36, 1)" },
  },
}

export const CALIPER: StylePackDefinition = {
  id: stylePackId("caliper"),
  name: "启动·精密工具",
  description: "冷灰钢蓝，工具台",
  tokens: {
    color: {
      bg: "oklch(0.97 0.005 250)",
      surface: "oklch(1 0 0)",
      ink: "oklch(0.22 0.02 250)",
      muted: "oklch(0.48 0.02 250)",
      accent: "oklch(0.52 0.12 250)",
      warn: "oklch(0.62 0.14 36)",
    },
    typography: {
      displayFamily: '"Noto Sans SC", "PingFang SC", sans-serif',
      bodyFamily: '"Noto Sans SC", "PingFang SC", sans-serif',
      monoFamily: mono,
      displayWeight: 500,
      bodySizePx: 14,
    },
    space: { safePct: 2, widgetGapPct: 1.2 },
    radius: { sm: "6px", md: "10px", lg: "14px" },
    elevation: { mode: "flat" },
    glass: { blurPx: 0, opacity: 0, highlight: 0, enabled: false },
    wallpaper: {
      kind: "gradient",
      fit: "cover",
      dim: 0,
      value:
        "linear-gradient(180deg, oklch(0.98 0.005 250), oklch(0.94 0.008 250))",
    },
    motion: { turnMs: 360, ease: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  },
}

export const DEW_GLASS: StylePackDefinition = {
  id: stylePackId("dew-glass"),
  name: "氛围·沉浸光雾",
  description: "夜雾液态玻璃",
  tokens: {
    color: {
      bg: "oklch(0.12 0.03 250)",
      surface: "oklch(0.22 0.04 240 / 0.45)",
      ink: "oklch(0.96 0.01 240)",
      muted: "oklch(0.78 0.03 230)",
      accent: "oklch(0.78 0.08 200)",
      glow: "oklch(0.85 0.06 40)",
    },
    typography: {
      displayFamily: '"Noto Sans SC", "PingFang SC", sans-serif',
      bodyFamily: '"Noto Sans SC", "PingFang SC", sans-serif',
      monoFamily: mono,
      displayWeight: 200,
      bodySizePx: 15,
    },
    space: { safePct: 2, widgetGapPct: 2 },
    radius: { sm: "12px", md: "20px", lg: "28px" },
    elevation: { mode: "glass" },
    glass: { blurPx: 24, opacity: 0.48, highlight: 0.35, enabled: true },
    wallpaper: {
      kind: "gradient",
      fit: "cover",
      dim: 0.22,
      value:
        "radial-gradient(ellipse at 50% 30%, oklch(0.28 0.06 240), oklch(0.1 0.03 250) 65%), radial-gradient(circle at 80% 80%, oklch(0.3 0.05 40 / 0.35), transparent 50%)",
    },
    motion: { turnMs: 560, ease: "cubic-bezier(0.16, 1, 0.3, 1)" },
  },
}

export const EDITOR_GRAPHITE: StylePackDefinition = {
  id: stylePackId("editor-graphite"),
  name: "编辑器·石墨",
  description: "编辑壳，系统明暗跟随",
  tokens: {
    color: {
      bg: "oklch(0.22 0.01 260)",
      surface: "oklch(0.28 0.01 260)",
      ink: "oklch(0.94 0.01 260)",
      muted: "oklch(0.7 0.01 260)",
      accent: "oklch(0.65 0.12 250)",
      danger: "oklch(0.6 0.18 25)",
    },
    typography: {
      displayFamily: '"Noto Sans SC", "PingFang SC", sans-serif',
      bodyFamily: '"Noto Sans SC", "PingFang SC", sans-serif',
      monoFamily: mono,
      displayWeight: 500,
      bodySizePx: 13,
    },
    space: { safePct: 0, widgetGapPct: 0.8 },
    radius: { sm: "4px", md: "8px", lg: "10px" },
    elevation: { mode: "flat" },
    glass: { blurPx: 12, opacity: 0.7, highlight: 0.1, enabled: true },
    wallpaper: { kind: "gradient", fit: "cover", dim: 0, value: "oklch(0.22 0.01 260)" },
    motion: { turnMs: 200, ease: "ease-out" },
  },
}

export const STYLE_PACKS: readonly StylePackDefinition[] = [
  INKSTONE,
  CALIPER,
  DEW_GLASS,
]

export const STYLE_PACK_BY_ID: Readonly<Record<string, StylePackDefinition>> = {
  [INKSTONE.id]: INKSTONE,
  [CALIPER.id]: CALIPER,
  [DEW_GLASS.id]: DEW_GLASS,
  [EDITOR_GRAPHITE.id]: EDITOR_GRAPHITE,
}

export function getStylePack(id: string): StylePackDefinition | undefined {
  return STYLE_PACK_BY_ID[id]
}

export function requireStylePack(id: string): StylePackDefinition {
  const pack = STYLE_PACK_BY_ID[id]
  if (!pack) {
    throw new Error(`unknown style pack: ${id}`)
  }
  return pack
}
