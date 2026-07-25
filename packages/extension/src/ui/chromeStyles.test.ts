import { describe, expect, test } from "bun:test"
import { EDITOR_GRAPHITE } from "@yindex/style-packs"
import {
  ACCENT_FILL_MAX_PCT,
  PANEL_OPEN_MS,
  PANEL_OPEN_REDUCED_MS,
  PRESS_MS,
  PRESS_SCALE,
  accentActionStyle,
  borrowAccentFill,
  chromeFontFamily,
  chromeStyleVars,
  dockStyle,
  panelStyle,
  settingsOverlayStyle,
  settingsSheetStyle,
} from "./chromeStyles"

const PAGE_ACCENT = "oklch(0.55 0.18 28)"

describe("graphite editor chrome contract", () => {
  test("caps page accent fill at eight percent", () => {
    expect(ACCENT_FILL_MAX_PCT).toBe(8)
  })

  test("opens panels inside the 160–240ms response window", () => {
    expect(PANEL_OPEN_MS).toBeGreaterThanOrEqual(160)
    expect(PANEL_OPEN_MS).toBeLessThanOrEqual(240)
  })

  test("uses the shared press response", () => {
    expect(PRESS_SCALE).toBe(0.97)
    expect(PRESS_MS).toBe(120)
  })

  test("locks chrome typography to a Sans family", () => {
    expect(chromeFontFamily).toMatch(/Sans/i)
    expect(chromeFontFamily).not.toMatch(/Noto Serif|Source Han Serif|Songti/i)
  })

  test("builds shared surfaces from graphite and capped Page accent", () => {
    const styles = [
      [panelStyle({ pageAccent: PAGE_ACCENT }), 8],
      [dockStyle({ pageAccent: PAGE_ACCENT }), 6],
      [settingsSheetStyle({ pageAccent: PAGE_ACCENT }), 8],
      [accentActionStyle({ pageAccent: PAGE_ACCENT }), 8],
    ] as const

    for (const [style, accentPct] of styles) {
      expect(String(style.background)).toContain(EDITOR_GRAPHITE.color.bg)
      expect(String(style.background)).toContain(PAGE_ACCENT)
      expect(String(style.background)).toContain(`${PAGE_ACCENT} ${accentPct}%`)
      expect(accentPct).toBeLessThanOrEqual(ACCENT_FILL_MAX_PCT)
    }
    expect(borrowAccentFill(PAGE_ACCENT, 40)).not.toContain("60%")
  })

  test("shortens panel opening when reduced motion is active", () => {
    const normal = panelStyle({ reducedMotion: false })
    const reduced = panelStyle({ reducedMotion: true })

    expect(PANEL_OPEN_REDUCED_MS).toBeLessThan(PANEL_OPEN_MS)
    expect(String(normal.animation)).toContain(`${PANEL_OPEN_MS}ms`)
    expect(String(reduced.animation)).toContain(`${PANEL_OPEN_REDUCED_MS}ms`)
  })

  test("resets native dialog geometry for a full-viewport Settings modal", () => {
    const overlay = settingsOverlayStyle()
    const sheet = settingsSheetStyle()

    expect(overlay.width).toBe("100vw")
    expect(overlay.height).toBe("100vh")
    expect(overlay.maxWidth).toBe("none")
    expect(overlay.maxHeight).toBe("none")
    expect(overlay.margin).toBe(0)
    expect(overlay.border).toBe(0)
    expect(sheet.width).toBe("min(460px, 100%)")
  })

  test("exposes one variable contract to every chrome root", () => {
    const vars = chromeStyleVars(PAGE_ACCENT)

    expect(vars["--chrome-accent"]).toBe(PAGE_ACCENT)
    expect(vars["--chrome-press-scale"]).toBe(PRESS_SCALE)
    expect(vars["--chrome-press-ms"]).toBe(`${PRESS_MS}ms`)
    expect(vars.fontFamily).toBe(chromeFontFamily)
  })
})
