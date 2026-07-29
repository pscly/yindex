import { expect, test } from "./extension.fixture"
import { collectRuntimeHardware } from "./extension.perf-lifecycle.hardware"
import { hardwareMetadata, writeJson } from "./extension.perf-lifecycle.helpers"
import {
  WALLPAPER_JS_WINDOW_MS,
  nearestRankPercentile,
} from "./extension.perf-lifecycle.metrics"
import { waitForProfiledHome } from "./extension.perf-lifecycle.page"
import {
  installFrameProbe,
  measureWallpaperJs,
  readFrameProbe,
} from "./extension.perf-lifecycle.probe"

const WALLPAPER_JS_P95_BUDGET_MS = 4
const SETTLE_MS = 1_500

test.describe.configure({ mode: "serial" })
test.use({ trace: "off" })
test.setTimeout(180_000)

test("strict nearest-rank Wallpaper-JS p95 stays under 4ms across the 10s reference window", async ({
  extensionContext,
  extensionId,
}) => {
  // Given a clean unpacked-Extension Home with the draw-attribution probe
  const { TASK26_WALLPAPER_RUN_ID: wallpaperRunId } = process.env
  const runId = wallpaperRunId ?? "adhoc"
  const worker =
    extensionContext.serviceWorkers()[0] ??
    (await extensionContext.waitForEvent("serviceworker"))
  await worker.evaluate("chrome.storage.local.clear()")
  const page = await extensionContext.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await installFrameProbe(page)
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await waitForProfiledHome(page)
  await expect(page.locator("[data-home-tab-active]")).toHaveAttribute(
    "data-home-tab-active",
    "true",
  )
  const hardware = await collectRuntimeHardware(page)

  // When the visible-active reference window is measured after a settle
  await page.waitForTimeout(SETTLE_MS)
  const durationsMs = await measureWallpaperJs(page, WALLPAPER_JS_WINDOW_MS)
  const probe = await readFrameProbe(page)
  const p50Ms = nearestRankPercentile(durationsMs, 0.5)
  const p95Ms = nearestRankPercentile(durationsMs, 0.95)
  const maxMs = durationsMs.length === 0 ? null : Math.max(...durationsMs)
  const browserVersion = extensionContext.browser()?.version() ?? "unknown"
  const browserUserAgent = await page.evaluate(() => navigator.userAgent)
  await writeJson(`wallpaper-js-p95-${runId}.json`, {
    activeWallpaperCanvas2dDraws: probe.activeWallpaperCanvas2dDraws,
    activeWallpaperDraws: probe.activeWallpaperDraws,
    activeWallpaperWebglDraws: probe.activeWallpaperWebglDraws,
    budgetMs: WALLPAPER_JS_P95_BUDGET_MS,
    durationsMs,
    generatedAt: new Date().toISOString(),
    hardware: hardwareMetadata(browserVersion, browserUserAgent, hardware),
    maxMs,
    p50Ms,
    p95Ms,
    runId,
    sampleCount: durationsMs.length,
    windowMs: WALLPAPER_JS_WINDOW_MS,
  })

  // Then samples are non-empty, direct draws were observed, and the budget holds
  expect(durationsMs.length).toBeGreaterThan(0)
  expect(probe.activeWallpaperDraws).toBeGreaterThan(0)
  expect(p95Ms).not.toBeNull()
  expect(p95Ms ?? Number.POSITIVE_INFINITY).toBeLessThan(
    WALLPAPER_JS_P95_BUDGET_MS,
  )

  // And the active generative stage exposes exactly one visible surface
  const stage = page.locator(
    '[data-page-slot-active="true"] [data-wallpaper-kind="generative"][data-wallpaper-active="true"]',
  )
  await expect(stage.locator("canvas[data-wallpaper-surface]")).toHaveCount(2)
  await expect(
    stage.locator('canvas[data-wallpaper-surface-visible="true"]'),
  ).toHaveCount(1)
  await page.close()
})
