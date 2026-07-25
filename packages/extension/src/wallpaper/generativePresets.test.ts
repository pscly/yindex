import { describe, expect, test } from "bun:test"
import { GENERATIVE_PRESETS, type GenerativePreset } from "@yindex/domain"
import {
  GENERATIVE_PRESET_MAP,
  getGenerativePreset,
  presetUniformPack,
} from "./generativePresets"

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
