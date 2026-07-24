import type {
  GenerativePreset,
  GlassProfile,
  PageStyle,
  SeedPalette,
  StylePackId,
  StyleTokens,
} from "@yindex/domain"
import {
  baseLiquidTokens,
  createGenerativePageStyle,
  pageStyleToTokens,
  stylePackId,
} from "@yindex/domain"

/**
 * Style Pack remains a coherent preset seam (scene light-field + seed palette).
 * Applying a pack produces a full v2 PageStyle; tokens are derived for UI shells.
 */
export type StylePackDefinition = {
  readonly id: StylePackId
  readonly name: string
  readonly description: string
  readonly generativePreset: GenerativePreset
  readonly glassProfile: GlassProfile
  readonly seedPalette: SeedPalette
  readonly pageStyle: PageStyle
  readonly tokens: StyleTokens
}

function packOf(input: {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly generativePreset: GenerativePreset
  readonly glassProfile: GlassProfile
  readonly seedPalette: SeedPalette
  readonly dim: number
}): StylePackDefinition {
  const styleR = createGenerativePageStyle({
    seedPalette: input.seedPalette,
    generativePreset: input.generativePreset,
    dim: input.dim,
    glassProfile: input.glassProfile,
  })
  if (!styleR.ok) {
    throw new Error(`style pack ${input.id} invalid: ${styleR.error.message}`)
  }
  const pageStyle = styleR.value
  return {
    id: stylePackId(input.id),
    name: input.name,
    description: input.description,
    generativePreset: input.generativePreset,
    glassProfile: input.glassProfile,
    seedPalette: input.seedPalette,
    pageStyle,
    tokens: pageStyleToTokens(pageStyle),
  }
}

export const MOMENT: StylePackDefinition = packOf({
  id: "moment",
  name: "此刻",
  description: "晨光场 · 开工启动",
  generativePreset: "moment",
  glassProfile: "balanced",
  dim: 0.12,
  seedPalette: {
    bg: "oklch(0.72 0.04 240)",
    surface: "oklch(0.92 0.02 240 / 0.45)",
    ink: "oklch(0.22 0.03 250)",
    muted: "oklch(0.42 0.02 250)",
    accent: "oklch(0.62 0.10 240)",
  },
})

export const MUSE: StylePackDefinition = packOf({
  id: "muse",
  name: "灵感",
  description: "暖墨场 · 阅读沉思",
  generativePreset: "muse",
  glassProfile: "balanced",
  dim: 0.2,
  seedPalette: {
    bg: "oklch(0.18 0.02 40)",
    surface: "oklch(0.28 0.03 40 / 0.5)",
    ink: "oklch(0.93 0.02 70)",
    muted: "oklch(0.72 0.03 60)",
    accent: "oklch(0.55 0.18 28)",
  },
})

export const FLOW: StylePackDefinition = packOf({
  id: "flow",
  name: "流光",
  description: "深海夜光 · 沉浸",
  generativePreset: "flow",
  glassProfile: "balanced",
  dim: 0.18,
  seedPalette: {
    bg: "oklch(0.12 0.03 260)",
    surface: "oklch(0.24 0.04 250 / 0.45)",
    ink: "oklch(0.96 0.01 240)",
    muted: "oklch(0.78 0.03 230)",
    accent: "oklch(0.78 0.08 200)",
  },
})

/** @deprecated alias — prefer MOMENT */
export const CALIPER = MOMENT
/** @deprecated alias — prefer MUSE */
export const INKSTONE = MUSE
/** @deprecated alias — prefer FLOW */
export const DEW_GLASS = FLOW

export const EDITOR_GRAPHITE: StylePackDefinition = {
  id: stylePackId("editor-graphite"),
  name: "编辑器·石墨",
  description: "编辑壳，系统明暗跟随",
  generativePreset: "moment",
  glassProfile: "balanced",
  seedPalette: {
    bg: "oklch(0.22 0.01 260)",
    surface: "oklch(0.28 0.01 260)",
    ink: "oklch(0.94 0.01 260)",
    muted: "oklch(0.7 0.01 260)",
    accent: "oklch(0.65 0.12 250)",
    danger: "oklch(0.6 0.18 25)",
  },
  pageStyle: MOMENT.pageStyle,
  tokens: {
    ...baseLiquidTokens("balanced"),
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
      monoFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      displayWeight: 500,
      bodySizePx: 13,
    },
    space: { safePct: 0, widgetGapPct: 0.8 },
    radius: { sm: "4px", md: "8px", lg: "10px" },
    elevation: { mode: "flat" },
    motion: { turnMs: 200, ease: "ease-out" },
  },
}

export const STYLE_PACKS: readonly StylePackDefinition[] = [MOMENT, MUSE, FLOW]

export const STYLE_PACK_BY_ID: Readonly<Record<string, StylePackDefinition>> = {
  [MOMENT.id]: MOMENT,
  [MUSE.id]: MUSE,
  [FLOW.id]: FLOW,
  [EDITOR_GRAPHITE.id]: EDITOR_GRAPHITE,
  // legacy ids map to new scenes so old UI buttons still resolve
  inkstone: MUSE,
  caliper: MOMENT,
  "dew-glass": FLOW,
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

export function applyStylePack(pack: StylePackDefinition): PageStyle {
  return pack.pageStyle
}
