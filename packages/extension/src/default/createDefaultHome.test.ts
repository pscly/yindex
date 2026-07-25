import { describe, expect, test } from "bun:test"
import {
  type BuiltinWidgetTypeId,
  HOME_SCHEMA_VERSION,
  type HomeDocument,
  type Page,
  type WidgetInstance,
  migrateHomeDocument,
  pageId,
  serializeHomeDocument,
} from "@yindex/domain"
import { createDefaultHome } from "./createDefaultHome"

const SAFE_MARGIN_PCT = 3

function builtinTypes(page: Page): readonly string[] {
  return page.widgets.map((widget) =>
    widget.source.kind === "builtin" ? String(widget.source.typeId) : "",
  )
}

function homePage(home: HomeDocument, id: string): Page {
  const page = home.pages[pageId(id)]
  if (!page) throw new TypeError(`Missing default Page: ${id}`)
  return page
}

function builtinWidget(page: Page, type: BuiltinWidgetTypeId): WidgetInstance {
  const widget = page.widgets.find(
    (candidate) =>
      candidate.source.kind === "builtin" &&
      String(candidate.source.typeId) === type,
  )
  if (!widget) throw new TypeError(`Missing default Widget: ${type}`)
  return widget
}

describe("createDefaultHome v2 scenes", () => {
  test("uses the exact 此刻 / 灵感 / 流光 sequence and lands on 此刻", () => {
    // Given / When
    const home = createDefaultHome()

    // Then
    expect(home.schemaVersion).toBe(HOME_SCHEMA_VERSION)
    expect(home.schemaVersion).toBe(2)
    expect(home.settings.motionProfile).toBe("balanced")

    expect(home.sequence.pageIds.map(String)).toEqual([
      "page_moment",
      "page_muse",
      "page_flow",
    ])
    expect(String(home.sequence.landingPageId)).toBe("page_moment")

    const moment = homePage(home, "page_moment")
    const muse = homePage(home, "page_muse")
    const flow = homePage(home, "page_flow")
    expect([moment.name, muse.name, flow.name]).toEqual([
      "此刻",
      "灵感",
      "流光",
    ])

    const presets = [moment, muse, flow].map((page) => {
      const w = page.style.wallpaper
      return w?.kind === "generative" ? w.generativePreset : null
    })
    expect(presets).toEqual(["moment", "muse", "flow"])
    expect(
      [moment, muse, flow].map((page) => page.style.typographyMood),
    ).toEqual(["sans", "serif", "sans"])

    for (const page of [moment, muse, flow]) {
      expect(page.style.glassProfile).toBe("balanced")
    }

    expect(builtinTypes(moment)).toEqual([
      "builtin.weather",
      "builtin.clock",
      "builtin.search",
      "builtin.shortcuts",
    ])
    expect(builtinTypes(muse)).toEqual(["builtin.quote", "builtin.hexagram"])
    expect(builtinTypes(flow)).toEqual(["builtin.clock"])
  })

  test("composes 此刻 as a centered top companion, upper-center search, and bottom shelf", () => {
    // Given / When
    const moment = homePage(createDefaultHome(), "page_moment")
    const weather = builtinWidget(moment, "builtin.weather")
    const clock = builtinWidget(moment, "builtin.clock")
    const search = builtinWidget(moment, "builtin.search")
    const shortcuts = builtinWidget(moment, "builtin.shortcuts")

    // Then: clock/date and weather share one centered top band
    expect(clock.config).toEqual({ showSeconds: false, compact: true })
    expect(clock.layout.y).toBe(weather.layout.y)
    expect(clock.layout.y).toBeLessThanOrEqual(8)
    expect(clock.layout.y + clock.layout.h).toBeLessThanOrEqual(20)
    expect(weather.layout.y + weather.layout.h).toBeLessThanOrEqual(20)
    expect(clock.layout.x).toBeLessThan(weather.layout.x)
    expect(
      (clock.layout.x + weather.layout.x + weather.layout.w) / 2,
    ).toBeCloseTo(50, 5)

    // Then: the search is a centered 44–56vw × 8–10vh capsule in the upper center
    expect(search.layout.w).toBeGreaterThanOrEqual(44)
    expect(search.layout.w).toBeLessThanOrEqual(56)
    expect(search.layout.h).toBeGreaterThanOrEqual(8)
    expect(search.layout.h).toBeLessThanOrEqual(10)
    expect(search.layout.x + search.layout.w / 2).toBe(50)
    expect(search.layout.y + search.layout.h / 2).toBeGreaterThanOrEqual(34)
    expect(search.layout.y + search.layout.h / 2).toBeLessThan(50)

    // Then: the shortcuts shelf occupies the bottom band without touching the edge
    expect(shortcuts.layout.h).toBeGreaterThanOrEqual(14)
    expect(shortcuts.layout.h).toBeLessThanOrEqual(18)
    expect(shortcuts.layout.x + shortcuts.layout.w / 2).toBe(50)
    expect(shortcuts.layout.y + shortcuts.layout.h).toBeGreaterThanOrEqual(92)
    expect(shortcuts.layout.y + shortcuts.layout.h).toBeLessThanOrEqual(97)
  })

  test("composes 灵感 with an upper quote and a lower-right hexagram", () => {
    // Given / When
    const muse = homePage(createDefaultHome(), "page_muse")
    const quote = builtinWidget(muse, "builtin.quote")
    const hexagram = builtinWidget(muse, "builtin.hexagram")

    // Then
    expect(quote.layout.y + quote.layout.h / 2).toBeLessThan(45)
    expect(quote.layout.w).toBeLessThanOrEqual(56)
    expect(hexagram.layout.x).toBeGreaterThanOrEqual(55)
    expect(hexagram.layout.y + hexagram.layout.h / 2).toBeGreaterThan(68)
  })

  test("composes 流光 as one oversized clock optically above center", () => {
    // Given / When
    const flow = homePage(createDefaultHome(), "page_flow")
    const clock = builtinWidget(flow, "builtin.clock")

    // Then
    expect(builtinTypes(flow)).toEqual(["builtin.clock"])
    expect(clock.layout.w).toBeGreaterThanOrEqual(72)
    expect(clock.layout.h).toBeGreaterThanOrEqual(42)
    expect(clock.layout.x + clock.layout.w / 2).toBe(50)
    expect(clock.layout.y + clock.layout.h / 2).toBeGreaterThanOrEqual(38)
    expect(clock.layout.y + clock.layout.h / 2).toBeLessThanOrEqual(44)
  })

  test("keeps every default Widget inside the 3% composition-safe margin", () => {
    // Given / When
    const home = createDefaultHome()

    // Then
    for (const page of Object.values(home.pages)) {
      for (const widget of page.widgets) {
        expect(widget.layout.x).toBeGreaterThanOrEqual(SAFE_MARGIN_PCT)
        expect(widget.layout.y).toBeGreaterThanOrEqual(SAFE_MARGIN_PCT)
        expect(widget.layout.x + widget.layout.w).toBeLessThanOrEqual(
          100 - SAFE_MARGIN_PCT,
        )
        expect(widget.layout.y + widget.layout.h).toBeLessThanOrEqual(
          100 - SAFE_MARGIN_PCT,
        )
      }
    }
  })

  test("serialized default home round-trips through migrate", () => {
    // Given
    const home = createDefaultHome()
    // When
    const raw = serializeHomeDocument(home)
    const back = migrateHomeDocument(raw)
    // Then
    expect(back.ok).toBe(true)
    if (back.ok) {
      expect(back.value.schemaVersion).toBe(2)
      expect(back.value.sequence.pageIds.length).toBe(3)
    }
  })
})
