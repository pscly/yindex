import { describe, expect, test } from "bun:test"
import { GENERATIVE_PRESETS, type GenerativePreset } from "@yindex/domain"
import {
  GENERATIVE_PRESET_MAP,
  type Rgb01,
  getGenerativePreset,
  presetUniformPack,
} from "./generativePresets"

function luminance(c: Rgb01): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

describe("generative preset descriptors", () => {
  test("map is exhaustive over Domain GenerativePreset keys", () => {
    // Given
    const keys = Object.keys(GENERATIVE_PRESET_MAP).sort()
    // When / Then
    expect(keys).toEqual([...GENERATIVE_PRESETS].sort())
    for (const id of GENERATIVE_PRESETS) {
      expect(GENERATIVE_PRESET_MAP[id].id).toBe(id)
    }
  })

  test("moment muse flow resolve to distinct light-field packs", () => {
    // Given
    const moment = getGenerativePreset("moment")
    const muse = getGenerativePreset("muse")
    const flow = getGenerativePreset("flow")
    // When
    const packs = [moment, muse, flow].map((d) => presetUniformPack(d))
    // Then — distinct color signatures (not equal blobs)
    const signatures = packs.map((p) =>
      p.colors
        .flat()
        .map((n) => n.toFixed(3))
        .join(","),
    )
    expect(new Set(signatures).size).toBe(3)
    expect(moment.hueStart).toBe(210)
    expect(moment.hueEnd).toBe(260)
    expect(moment.lightnessMin).toBeGreaterThanOrEqual(0.55)
    expect(muse.hueStart).toBe(30)
    expect(muse.lightnessMax).toBeLessThanOrEqual(0.34)
    expect(flow.auroraHues).toEqual([180, 320])
    expect(flow.auroraColors.length).toBe(2)
    expect(moment.auroraColors.length).toBe(0)
    expect(muse.auroraColors.length).toBe(0)
  })

  test("uniform pack is stable RGB in [0,1] for shaders/canvas", () => {
    // Given / When
    for (const id of GENERATIVE_PRESETS) {
      const pack = presetUniformPack(getGenerativePreset(id))
      // Then
      expect(pack.colors.length).toBeGreaterThanOrEqual(3)
      for (const rgb of pack.colors) {
        expect(rgb).toHaveLength(3)
        for (const c of rgb) {
          expect(c).toBeGreaterThanOrEqual(0)
          expect(c).toBeLessThanOrEqual(1)
        }
      }
      expect(pack.speed).toBeGreaterThan(0)
      expect(pack.noiseScale).toBeGreaterThan(0)
    }
  })

  test("getGenerativePreset returns same reference as map entry", () => {
    // Given
    const id: GenerativePreset = "flow"
    // When / Then
    expect(getGenerativePreset(id)).toBe(GENERATIVE_PRESET_MAP[id])
  })

  test("every field has a directional light: top stop brighter than deep base stop", () => {
    // Given / When / Then — colors[0] is the top light stop, colors[2] the base
    for (const id of GENERATIVE_PRESETS) {
      const d = getGenerativePreset(id)
      expect(luminance(d.colors[0] ?? [0, 0, 0])).toBeGreaterThan(
        luminance(d.colors[2] ?? [0, 0, 0]),
      )
    }
  })

  test("moment skylight spans a wide bright-to-deep lightness range", () => {
    // Given the moment descriptor
    const moment = getGenerativePreset("moment")
    // When / Then — airy top, discernibly deeper bottom (not flat noise)
    const top = luminance(moment.colors[0] ?? [0, 0, 0])
    const bottom = luminance(moment.colors[2] ?? [0, 0, 0])
    expect(top).toBeGreaterThan(0.5)
    expect(top - bottom).toBeGreaterThan(0.3)
  })

  test("muse carries perceptible warm cinnabar/gold glints over the deep ink base", () => {
    // Given the muse descriptor
    const muse = getGenerativePreset("muse")
    // Then — two warm glints (r > b), brighter than the deep base stop
    expect(muse.glintColors).toHaveLength(2)
    const base = luminance(muse.colors[2] ?? [0, 0, 0])
    for (const glint of muse.glintColors) {
      expect(glint[0]).toBeGreaterThan(glint[2])
      expect(luminance(glint)).toBeGreaterThan(base)
    }
    expect(muse.auroraColors).toHaveLength(0)
  })

  test("flow aurora bands are brighter than the deep sea base so ribbons stay visible", () => {
    // Given the flow descriptor
    const flow = getGenerativePreset("flow")
    // Then — each band outshines the brightest base stop (no near-black field)
    const brightestBase = Math.max(...flow.colors.map(luminance))
    for (const band of flow.auroraColors) {
      expect(luminance(band)).toBeGreaterThan(brightestBase)
    }
    expect(flow.glintColors).toHaveLength(0)
  })

  test("grain stays a very light film layer on every preset", () => {
    // Given / When / Then
    for (const id of GENERATIVE_PRESETS) {
      const grain = getGenerativePreset(id).grain
      expect(grain).toBeGreaterThan(0)
      expect(grain).toBeLessThanOrEqual(0.05)
    }
  })

  test("uniform pack carries glints and grain for the backends", () => {
    // Given / When
    for (const id of GENERATIVE_PRESETS) {
      const d = getGenerativePreset(id)
      const pack = presetUniformPack(d)
      // Then
      expect(pack.glints).toEqual(d.glintColors)
      expect(pack.grain).toBe(d.grain)
    }
  })

  test("production modules import domain via @yindex/domain package boundary", async () => {
    // Given production generative sources (exclude tests that mention domain/src as string)
    const files = [
      "generativePresets.ts",
      "generativeRenderer.ts",
      "generativeRendererTypes.ts",
      "generativeBackends.ts",
      "generativeGlBackend.ts",
      "generativeCanvasPort.ts",
    ]
    // When / Then — no deep relative domain path imports
    for (const name of files) {
      const text = await Bun.file(new URL(`./${name}`, import.meta.url)).text()
      expect(text.includes("../../../domain/src")).toBe(false)
      expect(text.includes('"../../../domain')).toBe(false)
      expect(text.includes("'../../../domain")).toBe(false)
    }
  })
})
