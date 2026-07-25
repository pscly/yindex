import type {
  GenerativePreset,
  GlassProfile,
  PageStyle,
  SeedPalette,
  StylePackId,
  TypographyMood,
} from "@yindex/domain"
import { createGenerativePageStyle, stylePackId } from "@yindex/domain"

/**
 * Style Pack remains a coherent preset seam (scene light-field + seed palette).
 * Applying a pack produces a full v2 PageStyle; tokens are derived for UI shells.
 */
export type StylePackDefinition = {
  readonly id: StylePackId
  readonly name: string
  readonly description: string
  readonly generativePreset: GenerativePreset
  readonly typographyMood: TypographyMood
  readonly glassProfile: GlassProfile
  readonly seedPalette: SeedPalette
  readonly pageStyle: PageStyle
}

function packOf(input: {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly generativePreset: GenerativePreset
  readonly typographyMood: TypographyMood
  readonly glassProfile: GlassProfile
  readonly seedPalette: SeedPalette
  readonly dim: number
}): StylePackDefinition {
  const styleR = createGenerativePageStyle({
    seedPalette: input.seedPalette,
    generativePreset: input.generativePreset,
    typographyMood: input.typographyMood,
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
    typographyMood: input.typographyMood,
    glassProfile: input.glassProfile,
    seedPalette: input.seedPalette,
    pageStyle,
  }
}

export const MOMENT: StylePackDefinition = packOf({
  id: "moment",
  name: "此刻",
  description: "晨光场 · 开工启动",
  generativePreset: "moment",
  typographyMood: "sans",
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
  typographyMood: "serif",
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
  typographyMood: "sans",
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

export const STYLE_PACKS = [
  MOMENT,
  MUSE,
  FLOW,
] as const satisfies readonly StylePackDefinition[]

export function getStylePack(id: string): StylePackDefinition | undefined {
  return STYLE_PACKS.find((pack) => pack.id === id)
}

export function requireStylePack(id: string): StylePackDefinition {
  const pack = getStylePack(id)
  if (!pack) {
    throw new Error(`unknown style pack: ${id}`)
  }
  return pack
}

export function applyStylePack(pack: StylePackDefinition): PageStyle {
  return pack.pageStyle
}
