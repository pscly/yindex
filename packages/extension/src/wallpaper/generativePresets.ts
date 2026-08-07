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
  /**
   * Field stops in linear-ish sRGB 0–1, ordered by light role:
   * [0] top light stop (brightest), [1] large soft blob A,
   * [2] bottom deep stop (darkest), [3] large soft blob B.
   */
  readonly colors: readonly Rgb01[]
  /** Aurora band colors when present (流光) */
  readonly auroraColors: readonly Rgb01[]
  /** Warm ember glint colors (暖墨 朱砂/金); empty otherwise */
  readonly glintColors: readonly Rgb01[]
  /** Film grain amplitude (very light, 0–0.05) */
  readonly grain: number
  /** Relative flow speed (shader u_speed scale) */
  readonly speed: number
  /** Large-blob spatial scale (low frequency = soft, premium fields) */
  readonly noiseScale: number
}

/** GPU / Canvas2D uniform pack — only numbers, no prose. */
export type PresetUniformPack = {
  readonly colors: readonly Rgb01[]
  readonly aurora: readonly Rgb01[]
  readonly glints: readonly Rgb01[]
  readonly grain: number
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
    oklchToRgb(Lmax, C * 0.6, hueStart),
    oklchToRgb(Lmin + (Lmax - Lmin) * 0.62, C, midH),
    oklchToRgb(Lmin, C * 0.75, hueEnd),
    oklchToRgb(Lmax * 0.92, C * 0.5, hueEnd - 10),
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
    glintColors: [],
    grain: 0.022,
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
    chroma: 0.06,
    auroraHues: [],
    colors: fieldColors(30, 60, 0.16, 0.34, 0.06),
    auroraColors: [],
    glintColors: [oklchToRgb(0.55, 0.18, 28), oklchToRgb(0.72, 0.13, 85)],
    grain: 0.03,
    speed: 0.28,
    noiseScale: 1.2,
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
    lightnessMin: 0.14,
    lightnessMax: 0.3,
    chroma: 0.08,
    auroraHues,
    colors: fieldColors(240, 290, 0.14, 0.3, 0.08),
    auroraColors: [oklchToRgb(0.62, 0.13, 180), oklchToRgb(0.55, 0.16, 320)],
    glintColors: [],
    grain: 0.026,
    speed: 0.42,
    noiseScale: 1.3,
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
    glints: desc.glintColors,
    grain: desc.grain,
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
