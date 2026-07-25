import {
  GENERATIVE_PRESETS,
  type GenerativePreset,
  assertNever,
} from "@yindex/domain"

/** sRGB channel 0–1 */
export type Rgb01 = readonly [number, number, number]

/**
 * Render-facing descriptor for one Domain generative light-field preset.
 * Values mirror DESIGN.md Page 光场 seeds (此刻/灵感/流光).
 */
export type GenerativePresetDescriptor = {
  readonly id: GenerativePreset
  /** Alias of `id` for call sites that read `.preset` */
  readonly preset: GenerativePreset
  readonly label: string
  /** OKLCH hue range for the field */
  readonly hueStart: number
  readonly hueEnd: number
  readonly lightnessMin: number
  readonly lightnessMax: number
  /** Base chroma for field stops (low for 晨光, warmer for 暖墨) */
  readonly chroma: number
  /** Extra aurora band hues (流光 only); empty otherwise */
  readonly auroraHues: readonly number[]
  /** Precomputed field stop colors in linear-ish sRGB 0–1 */
  readonly colors: readonly Rgb01[]
  /** Aurora band colors when present */
  readonly auroraColors: readonly Rgb01[]
  /** Relative flow speed (shader u_speed scale) */
  readonly speed: number
  /** Spatial noise scale */
  readonly noiseScale: number
}

/** GPU / Canvas2D uniform pack — only numbers, no prose. */
export type PresetUniformPack = {
  readonly colors: readonly Rgb01[]
  readonly aurora: readonly Rgb01[]
  readonly speed: number
  readonly noiseScale: number
  readonly hueStart: number
  readonly hueEnd: number
}

/**
 * Approximate OKLCH → sRGB (0–1). Sufficient for soft light-fields;
 * not a color-managed pipeline.
 */
export function oklchToRgb(L: number, C: number, hDeg: number): Rgb01 {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return [clamp01(r), clamp01(g), clamp01(bl)]
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

function fieldColors(
  hueStart: number,
  hueEnd: number,
  Lmin: number,
  Lmax: number,
  C: number,
): readonly Rgb01[] {
  const midH = (hueStart + hueEnd) / 2
  return [
    oklchToRgb(Lmax, C * 0.55, hueStart),
    oklchToRgb((Lmin + Lmax) / 2, C, midH),
    oklchToRgb(Lmin, C * 0.7, hueEnd),
    oklchToRgb(Lmax * 0.92, C * 0.4, hueEnd - 10),
  ]
}

function buildMoment(): GenerativePresetDescriptor {
  return {
    id: "moment",
    preset: "moment",
    label: "此刻 · 晨光",
    hueStart: 210,
    hueEnd: 260,
    lightnessMin: 0.55,
    lightnessMax: 0.88,
    chroma: 0.06,
    auroraHues: [],
    colors: fieldColors(210, 260, 0.55, 0.88, 0.06),
    auroraColors: [],
    speed: 0.35,
    noiseScale: 1.1,
  }
}

function buildMuse(): GenerativePresetDescriptor {
  return {
    id: "muse",
    preset: "muse",
    label: "灵感 · 暖墨",
    hueStart: 30,
    hueEnd: 60,
    lightnessMin: 0.16,
    lightnessMax: 0.34,
    chroma: 0.05,
    auroraHues: [],
    colors: fieldColors(30, 60, 0.16, 0.34, 0.05),
    auroraColors: [],
    speed: 0.28,
    noiseScale: 1.25,
  }
}

function buildFlow(): GenerativePresetDescriptor {
  const auroraHues = [180, 320] as const
  return {
    id: "flow",
    preset: "flow",
    label: "流光 · 深海夜光",
    hueStart: 240,
    hueEnd: 290,
    lightnessMin: 0.1,
    lightnessMax: 0.26,
    chroma: 0.07,
    auroraHues,
    colors: fieldColors(240, 290, 0.1, 0.26, 0.07),
    auroraColors: [oklchToRgb(0.42, 0.1, 180), oklchToRgb(0.38, 0.12, 320)],
    speed: 0.42,
    noiseScale: 1.4,
  }
}

export const GENERATIVE_PRESET_MAP = {
  moment: buildMoment(),
  muse: buildMuse(),
  flow: buildFlow(),
} as const satisfies Record<GenerativePreset, GenerativePresetDescriptor>

export function getGenerativePreset(
  id: GenerativePreset,
): GenerativePresetDescriptor {
  switch (id) {
    case "moment":
      return GENERATIVE_PRESET_MAP.moment
    case "muse":
      return GENERATIVE_PRESET_MAP.muse
    case "flow":
      return GENERATIVE_PRESET_MAP.flow
    default:
      return assertNever(id)
  }
}

/** Preferred name for renderer call sites */
export const getGenerativePresetDescriptor = getGenerativePreset

export function presetUniformPack(
  desc: GenerativePresetDescriptor,
): PresetUniformPack {
  return {
    colors: desc.colors,
    aurora: desc.auroraColors,
    speed: desc.speed,
    noiseScale: desc.noiseScale,
    hueStart: desc.hueStart,
    hueEnd: desc.hueEnd,
  }
}

/** Exhaustiveness guard for tests / tooling */
export function listPresetIds(): readonly GenerativePreset[] {
  return GENERATIVE_PRESETS
}
