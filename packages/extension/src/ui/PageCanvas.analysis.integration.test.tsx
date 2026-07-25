import { describe, expect, test } from "bun:test"
import {
  BALANCED_SAFE_ANALYSIS,
  type StyleTokens,
  type Wallpaper,
  createGenerativeWallpaper,
  createImageWallpaper,
} from "@yindex/domain"
import { createElement, isValidElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../default/createDefaultHome"
import { activeWallpaperSlots } from "../newtab/wallpaperActivity"
import { analyzeGenerativeWallpaper } from "../wallpaper/wallpaperAnalyzer"
import { PageCanvas, pageTokensOf } from "./PageCanvas"
import { WidgetMount } from "./WidgetMount"
import { pageTokenCssVars } from "./pageTokenCssVars"

const noWidget = (): void => {}

function defaultPageFixture() {
  const doc = createDefaultHome()
  const pageId = doc.sequence.pageIds[0]
  const page = pageId === undefined ? undefined : doc.pages[pageId]
  if (page === undefined) {
    throw new Error("default Home must contain its first Page")
  }
  return { doc, page }
}

function renderPage(
  wallpaperActive = true,
  reducedMotion = false,
  wallpaper?: Wallpaper,
): string {
  const { doc, page } = defaultPageFixture()
  return renderToStaticMarkup(
    createElement(PageCanvas, {
      doc,
      page:
        wallpaper === undefined
          ? page
          : { ...page, style: { ...page.style, wallpaper } },
      editMode: false,
      wallpaperActive,
      reducedMotion,
      selectedWidgetId: null,
      onSelectWidget: noWidget,
      onWidgetConfig: noWidget,
    }),
  )
}

function imageWallpaperFixture(): Wallpaper {
  const parsed = createImageWallpaper({
    mediaRef: "fixture-image",
    dim: 0.2,
  })
  if (!parsed.ok) throw new Error(parsed.error.message)
  return parsed.value
}

describe("PageCanvas Wallpaper analysis integration", () => {
  test("Given analysis has not published, When a Page renders, Then balanced-safe CSS tokens and fallback state are on its root", () => {
    // Given / When
    const markup = renderPage(true, false, imageWallpaperFixture())

    // Then
    expect(markup).toContain('data-analysis-ready="false"')
    expect(markup).toContain('data-used-fallback="true"')
    expect(markup).toContain("data-lens-polarity=")
    expect(markup).toContain("data-content-polarity=")
    expect(markup).toContain("--yindex-ink:")
    expect(markup).toContain("--yindex-lens-ink:")
    expect(markup).toContain("--yindex-content-direct-ink:")
    expect(markup).toContain("--yindex-glass-tint:")
    expect(markup).toContain("--yindex-glass-scrim:")
    expect(markup).toContain("--yindex-glass-blur:")
    expect(markup).toContain("--yindex-glass-opacity:")
    expect(markup).toContain("--yindex-glass-saturation:")
    expect(markup).toContain("--yindex-glass-highlight:")
  })

  test("Given a generative Wallpaper is ready, When PageCanvas renders, Then its root exposes live non-fallback analysis tokens", () => {
    // Given
    const { page } = defaultPageFixture()
    if (page.style.wallpaper.kind !== "generative") {
      throw new Error("default first Page must use a generative Wallpaper")
    }
    const published = analyzeGenerativeWallpaper(
      page.style.wallpaper.generativePreset,
    )

    // When
    const markup = renderPage()

    // Then
    expect(published.usedFallback).toBe(false)
    expect(markup).toContain('data-analysis-ready="true"')
    expect(markup).toContain('data-used-fallback="false"')
    expect(markup).toContain(
      `data-lens-polarity="${pageTokensOf(page, published.analysis).glass.adaptive.lens.polarity}"`,
    )
  })

  test("Given bright and dark fixtures, When Page tokens resolve, Then lens and content-direct polarity flip independently", () => {
    // Given
    const { page } = defaultPageFixture()

    // When
    const bright = pageTokensOf(page, {
      luminance: 0.88,
      chroma: 0.08,
      detail: 0.1,
    })
    const dark = pageTokensOf(page, {
      luminance: 0.14,
      chroma: 0.05,
      detail: 0.12,
    })

    // Then
    expect(bright.glass.adaptive.lens.polarity).toBe("light-on-dark")
    expect(bright.glass.adaptive.contentDirect.polarity).toBe("dark-on-light")
    expect(dark.glass.adaptive.lens.polarity).toBe("dark-on-light")
    expect(dark.glass.adaptive.contentDirect.polarity).toBe("light-on-dark")
  })

  test("Given adaptive Page tokens, When root CSS variables resolve, Then each surface branch maps to its own material", () => {
    // Given
    const { page } = defaultPageFixture()
    const tokens = pageTokensOf(page, {
      luminance: 0.88,
      chroma: 0.08,
      detail: 0.1,
    })

    // When
    const css = pageTokenCssVars(tokens)

    // Then
    expect(css["--yindex-lens-ink"]).toBe(tokens.glass.adaptive.lens.foreground)
    expect(css["--yindex-content-direct-ink"]).toBe(
      tokens.glass.adaptive.contentDirect.foreground,
    )
    expect(css["--yindex-glass-tint"]).toBe(tokens.glass.adaptive.lens.tint)
    expect(css["--yindex-content-direct-scrim"]).toBe(
      tokens.glass.adaptive.contentDirect.scrim,
    )
  })

  test("Given Page profile and dim changes, When the same live analysis re-resolves, Then material and Wallpaper tokens update", () => {
    // Given
    const { page } = defaultPageFixture()
    const analysis = { luminance: 0.14, chroma: 0.05, detail: 0.12 }
    const wallpaper = createGenerativeWallpaper({
      generativePreset: "moment",
      dim: 0.6,
    })
    if (!wallpaper.ok) throw new Error(wallpaper.error.message)

    // When
    const clear = pageTokensOf(
      { ...page, style: { ...page.style, glassProfile: "clear" } },
      analysis,
    )
    const deepAndDimmed = pageTokensOf(
      {
        ...page,
        style: {
          ...page.style,
          wallpaper: wallpaper.value,
          glassProfile: "deep",
        },
      },
      analysis,
    )

    // Then
    expect(deepAndDimmed.glass.blurPx).toBeGreaterThan(clear.glass.blurPx)
    expect(deepAndDimmed.wallpaper.dim).toBe(0.6)
    expect(deepAndDimmed.glass.adaptive.analysis).toEqual(analysis)
  })

  test("Given analysis is unavailable, When Page tokens resolve, Then balanced-safe tokens still render", () => {
    // Given
    const { page } = defaultPageFixture()

    // When
    const tokens = pageTokensOf(page, null)

    // Then
    expect(tokens.glass.adaptive.analysis).toEqual(BALANCED_SAFE_ANALYSIS)
    expect(tokens.glass.adaptive.usedFallback).toBe(true)
    expect(tokens.glass.adaptive.lens.contrastRatio).toBeGreaterThanOrEqual(4.5)
    expect(
      tokens.glass.adaptive.contentDirect.contrastRatio,
    ).toBeGreaterThanOrEqual(4.5)
  })

  test("Given Wallpaper analysis updates, When a Widget mounts, Then it receives the updated Page tokens by identity", () => {
    // Given
    const { doc, page } = defaultPageFixture()
    const widget = page.widgets[0]
    if (widget === undefined) {
      throw new Error("default first Page must contain a Widget")
    }
    const brightTokens = pageTokensOf(page, {
      luminance: 0.88,
      chroma: 0.08,
      detail: 0.1,
    })
    const darkTokens = pageTokensOf(page, {
      luminance: 0.14,
      chroma: 0.05,
      detail: 0.12,
    })

    // When
    const brightMount = WidgetMount({
      doc,
      pageId: page.id,
      widget,
      pageTokens: brightTokens,
      editMode: false,
      onWidgetConfig: noWidget,
    })
    const darkMount = WidgetMount({
      doc,
      pageId: page.id,
      widget,
      pageTokens: darkTokens,
      editMode: false,
      onWidgetConfig: noWidget,
    })

    // Then
    if (
      !isValidElement<{ readonly tokens: StyleTokens }>(brightMount) ||
      !isValidElement<{ readonly tokens: StyleTokens }>(darkMount)
    ) {
      throw new Error("WidgetMount must return a token-consuming Widget")
    }
    expect(brightMount.props.tokens).toBe(brightTokens)
    expect(darkMount.props.tokens).toBe(darkTokens)
    expect(brightMount.props.tokens).not.toBe(darkMount.props.tokens)
    expect(darkMount.props.tokens.glass.adaptive.analysis.luminance).toBe(0.14)
  })

  test("Given idle Loop clones, When Page activity is applied, Then only the visible mount subscribes to analysis", () => {
    // Given
    const slots = activeWallpaperSlots({
      fadeLayers: null,
      offsetY: -20,
      stripSlots: 5,
    })

    // When
    const markup = Array.from({ length: 5 }, (_, slot) =>
      renderPage(slots.has(slot)),
    )

    // Then
    expect(
      markup.filter((value) =>
        value.includes('data-wallpaper-analysis-active="true"'),
      ),
    ).toHaveLength(1)
    expect(
      markup.filter((value) =>
        value.includes('data-wallpaper-analysis-active="false"'),
      ),
    ).toHaveLength(4)
  })

  test("Given reduced motion, When a Page mounts, Then Wallpaper analysis is marked for reduced cadence", () => {
    // Given / When
    const markup = renderPage(true, true)

    // Then
    expect(markup).toContain('data-wallpaper-reduced-motion="true"')
  })
})
