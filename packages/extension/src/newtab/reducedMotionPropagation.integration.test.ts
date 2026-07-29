import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createGenerativePageStyle, pageStyleToTokens } from "@yindex/domain"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../default/createDefaultHome"
import { EXTENSION_VERSION } from "../extensionVersion"
import { createHostInitMessage } from "../ui/PackageWidgetFrame"
import { SettingsPanel } from "../ui/SettingsPanel"
import {
  PANEL_OPEN_MS,
  PANEL_OPEN_REDUCED_MS,
  chromeStyleVars,
  settingsSheetStyle,
} from "../ui/chromeStyles"
import { ambientHighlightStyle, ambientMotionAllowed } from "./ambientMotion"
import { resolveGoByAction, resolveGoToAction } from "./pageTurnActions"
import { createIdleGesture } from "./pageTurnGesture"
import { PAGE_TURN_POLICY } from "./pageTurnPolicy"
import { runHostReducedFade } from "./pageTurnTestUtil"
import { prefersReducedMotion } from "./pageTurnWheelGuard"

const OS_REDUCE = (): { readonly matches: boolean } => ({ matches: true })
const OS_MOTION = (): { readonly matches: boolean } => ({ matches: false })

function packageTokens() {
  const style = createGenerativePageStyle({
    seedPalette: {
      bg: "oklch(0.18 0.02 250)",
      surface: "oklch(0.24 0.02 250)",
      ink: "oklch(0.96 0.01 250)",
      muted: "oklch(0.76 0.02 250)",
      accent: "oklch(0.68 0.1 220)",
    },
    generativePreset: "flow",
    glassProfile: "balanced",
  })
  if (!style.ok) throw new Error(style.error.message)
  return pageStyleToTokens(style.value, {
    luminance: 0.14,
    chroma: 0.07,
    detail: 0.05,
  })
}

describe("OS reduced-motion propagation across consumers", () => {
  test("Given stored never and OS reduce, When shared seams resolve, Then non-essential consumers reduce and Page Turn keeps a 120ms crossfade", () => {
    // Given: Settings “始终动画” conflicts with OS prefers-reduced-motion
    const storedNever = "never" as const
    const motionProfile = "immersive" as const
    const home = createDefaultHome()

    // When: essential + non-essential seams resolve from the same discriminating inputs
    const pageTurnReduced = prefersReducedMotion(storedNever, OS_REDUCE)
    const ambientAllowed = ambientMotionAllowed({
      reducedMotionSetting: storedNever,
      osPrefersReduced: true,
      pageActive: true,
    })
    const chromeVars = chromeStyleVars(undefined, pageTurnReduced)
    const settingsSheet = settingsSheetStyle({ reducedMotion: pageTurnReduced })
    const packageInit = createHostInitMessage({
      instanceId: "widget-package-causal",
      config: { durationMinutes: 25 },
      reducedMotion: pageTurnReduced,
      size: { width: 320, height: 180 },
      tokens: packageTokens(),
    })
    const highlight = ambientHighlightStyle({
      profile: motionProfile,
      allowed: ambientAllowed,
      pageActive: true,
    })
    const goBy = resolveGoByAction({
      sequence: home.sequence,
      currentIndex: 0,
      delta: 1,
      gesture: createIdleGesture(0, 0),
      now: 1_000,
      reducedMotion: pageTurnReduced,
      generation: 1,
    })
    const goTo = resolveGoToAction({
      index: 1,
      pageCount: home.sequence.pageIds.length,
      currentIndex: 0,
      phase: "idle",
      reducedMotion: pageTurnReduced,
      now: 1_000,
    })
    const fade = runHostReducedFade({
      pageCount: 3,
      fromIndex: 0,
      toIndex: 1,
      frameMs: 16,
    })

    // Then: OS wins for ambient/chrome/Package; essential navigation remains a 120ms two-layer fade
    expect(pageTurnReduced).toBe(true)
    expect(ambientAllowed).toBe(false)
    expect(chromeVars["--chrome-panel-open-ms"]).toBe(
      `${PANEL_OPEN_REDUCED_MS}ms`,
    )
    expect(PANEL_OPEN_REDUCED_MS).toBe(120)
    expect(PANEL_OPEN_REDUCED_MS).toBeLessThan(PANEL_OPEN_MS)
    expect(String(settingsSheet.animation)).toContain(
      `${PANEL_OPEN_REDUCED_MS}ms`,
    )
    expect(packageInit.reducedMotion).toBe(true)
    expect(highlight).toEqual({})
    expect(goBy).toEqual({ kind: "reduced", targetIndex: 1 })
    expect(goTo.kind).toBe("reduced_fade")
    expect(PAGE_TURN_POLICY.reducedMotionMs).toBe(120)
    expect(fade.settledIndex).toBe(1)
    const mid = fade.snapshots.find(
      (s) =>
        s.phase === "reduced_fade" &&
        s.opacityFrom > 0.2 &&
        s.opacityFrom < 0.8,
    )
    expect(mid).toBeDefined()
    if (mid) {
      expect(mid.parallaxY).toBe(0)
      expect(mid.opacityFrom + mid.opacityTo).toBeCloseTo(1, 10)
      expect(mid.fadeLayers).toEqual({
        outgoing: { index: 0, opacity: mid.opacityFrom },
        incoming: { index: 1, opacity: mid.opacityTo },
      })
    }
    const lastFade = fade.snapshots
      .filter((s) => s.phase === "reduced_fade")
      .at(-1)
    expect(lastFade?.t).toBeLessThan(PAGE_TURN_POLICY.reducedMotionMs)
    expect(lastFade?.t).toBeGreaterThanOrEqual(
      PAGE_TURN_POLICY.reducedMotionMs - 16,
    )
  })

  test("Given stored never without OS reduce, When seams resolve, Then animation may run and chrome uses the full panel window", () => {
    const pageTurnReduced = prefersReducedMotion("never", OS_MOTION)
    const ambientAllowed = ambientMotionAllowed({
      reducedMotionSetting: "never",
      osPrefersReduced: false,
      pageActive: true,
    })
    const chromeVars = chromeStyleVars(undefined, pageTurnReduced)
    const packageInit = createHostInitMessage({
      instanceId: "widget-package-motion",
      config: {},
      reducedMotion: pageTurnReduced,
      size: { width: 200, height: 120 },
      tokens: packageTokens(),
    })

    expect(pageTurnReduced).toBe(false)
    expect(ambientAllowed).toBe(true)
    expect(chromeVars["--chrome-panel-open-ms"]).toBe(`${PANEL_OPEN_MS}ms`)
    expect(packageInit.reducedMotion).toBe(false)
  })

  test("Given force without OS reduce, When seams resolve, Then product force still reduces everywhere", () => {
    const pageTurnReduced = prefersReducedMotion("force", OS_MOTION)
    const ambientAllowed = ambientMotionAllowed({
      reducedMotionSetting: "force",
      osPrefersReduced: false,
      pageActive: true,
    })

    expect(pageTurnReduced).toBe(true)
    expect(ambientAllowed).toBe(false)
  })
})

describe("extension version single source of truth", () => {
  test("Given package and manifest contracts, When Settings About renders, Then UI version equals EXTENSION_VERSION and 0.2.0", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(import.meta.dir, "../../package.json"), "utf8"),
    ) as { readonly version?: unknown }
    const manifest = JSON.parse(
      readFileSync(
        resolve(import.meta.dir, "../../public/manifest.json"),
        "utf8",
      ),
    ) as { readonly version?: unknown }
    const packageVersion =
      typeof packageJson.version === "string" ? packageJson.version : ""
    const manifestVersion =
      typeof manifest.version === "string" ? manifest.version : ""

    expect(packageVersion).toBe("0.2.0")
    expect(manifestVersion).toBe("0.2.0")
    expect(EXTENSION_VERSION).toBe(packageVersion)
    expect(EXTENSION_VERSION).toBe(manifestVersion)

    const doc = createDefaultHome()
    const markup = renderToStaticMarkup(
      createElement(SettingsPanel, {
        open: true,
        doc,
        pageId: doc.sequence.pageIds[0] ?? null,
        onClose: () => {},
        onDoc: () => {},
        onReplaceDoc: () => {},
      }),
    )

    expect(markup).toContain(`yindex v${EXTENSION_VERSION}`)
    expect(markup).not.toContain("yindex v0.1.3")
    expect(markup).not.toMatch(/yindex v0\.1\./)
  })
})
