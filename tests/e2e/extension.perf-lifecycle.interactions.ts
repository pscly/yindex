import { expect } from "./extension.fixture"
import {
  IDLE_WINDOW_MS,
  captureCdpTrace,
  collectHeapBytes,
  mebibytes,
  median,
  round,
} from "./extension.perf-lifecycle.helpers"
import { readRendererActivity } from "./extension.perf-lifecycle.page"
import { measureTurns, readFrameProbe } from "./extension.perf-lifecycle.probe"
import type {
  InteractionProfile,
  ProfiledHome,
} from "./extension.perf-lifecycle.types"

const MATERIAL_HEAP_STEP_MIB = 1
const STRESS_TURNS = 100
const DIALOG_INTERVAL = 5
const HEAP_SAMPLE_INTERVAL = 20

export async function profileInteractions(
  home: ProfiledHome,
): Promise<InteractionProfile> {
  const { page, runId, session } = home
  await page.getByRole("button", { name: "设置" }).focus()
  let forward = { durationsMs: [] as readonly number[], turnsWithLongFrames: 0 }
  let reverse = { durationsMs: [] as readonly number[], turnsWithLongFrames: 0 }
  const turnTraceEvents = await captureCdpTrace(
    session,
    `page-turns-${runId}.trace.json`,
    async () => {
      forward = await measureTurns(page, "PageDown", 30)
      reverse = await measureTurns(page, "PageUp", 30)
    },
  )

  await page.emulateMedia({ reducedMotion: "reduce" })
  const activeWallpaper = page.locator(
    '[data-page-slot-active="true"] [data-wallpaper-active="true"]',
  )
  await expect(activeWallpaper).toHaveAttribute(
    "data-wallpaper-reduced-motion",
    "true",
  )
  let reducedForward = {
    durationsMs: [] as readonly number[],
    turnsWithLongFrames: 0,
  }
  let reducedReverse = {
    durationsMs: [] as readonly number[],
    turnsWithLongFrames: 0,
  }
  const reducedTraceEvents = await captureCdpTrace(
    session,
    `reduced-motion-${runId}.trace.json`,
    async () => {
      reducedForward = await measureTurns(page, "PageDown", 3)
      reducedReverse = await measureTurns(page, "PageUp", 3)
    },
  )
  await expect(page.locator("[data-page-turn-role]")).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await expect(activeWallpaper).toHaveAttribute(
    "data-wallpaper-reduced-motion",
    "false",
  )
  const rendererActivity = await readRendererActivity(page)

  const visibleBefore = await readFrameProbe(page)
  await page.waitForTimeout(500)
  const visibleAfter = await readFrameProbe(page)
  let idleBefore = await readFrameProbe(page)
  let idleAfter = idleBefore
  let inactiveTabTransitions = 0
  const idleTraceEvents = await captureCdpTrace(
    session,
    `wallpaper-idle-${runId}.trace.json`,
    async () => {
      const currentTab = await page.evaluate<{
        readonly id?: number
        readonly windowId?: number
      } | null>("chrome.tabs.getCurrent()")
      if (currentTab?.id === undefined || currentTab.windowId === undefined) {
        throw new Error("Profiled Home tab identity is missing")
      }
      const coverTab = await page.evaluate<{ readonly id?: number }>(
        `chrome.tabs.create({ active: true, url: "about:blank", windowId: ${currentTab.windowId} })`,
      )
      if (coverTab.id === undefined) {
        throw new Error("Background cover tab identity is missing")
      }
      await expect(page.locator("[data-home-tab-active]")).toHaveAttribute(
        "data-home-tab-active",
        "false",
      )
      inactiveTabTransitions += 1
      idleBefore = await readFrameProbe(page)
      await new Promise((resolveIdle) =>
        setTimeout(resolveIdle, IDLE_WINDOW_MS),
      )
      idleAfter = await readFrameProbe(page)
      await page.evaluate(`chrome.tabs.remove(${coverTab.id})`)
      await expect(page.locator("[data-home-tab-active]")).toHaveAttribute(
        "data-home-tab-active",
        "true",
      )
      inactiveTabTransitions += 1
    },
  )

  const heapBytes: number[] = [await collectHeapBytes(session)]
  const stressTraceEvents = await captureCdpTrace(
    session,
    `stress-${runId}.trace.json`,
    async () => {
      for (let turn = 1; turn <= STRESS_TURNS; turn += 1) {
        await measureTurns(page, "PageDown", 1)
        if (turn % DIALOG_INTERVAL !== 0) continue
        await page.getByRole("button", { name: "设置" }).click()
        const dialog = page.getByRole("dialog", { name: "设置" })
        await expect(dialog).toBeVisible()
        await dialog.getByRole("button", { name: "关闭" }).click()
        await expect(dialog).toBeHidden()
        if (turn % HEAP_SAMPLE_INTERVAL === 0) {
          heapBytes.push(await collectHeapBytes(session))
        }
      }
    },
  )
  const heapMiB = heapBytes.map(mebibytes)
  const initialHeapMiB = heapMiB[0] ?? 0
  const materiallyMonotonic = heapMiB
    .slice(1)
    .every(
      (value, index) =>
        value - (heapMiB[index] ?? value) >= MATERIAL_HEAP_STEP_MIB,
    )
  const reducedMs = [
    ...reducedForward.durationsMs,
    ...reducedReverse.durationsMs,
  ]

  return {
    heap: {
      dialogCycles: STRESS_TURNS / DIALOG_INTERVAL,
      finalGrowthMiB: round(
        (heapMiB.at(-1) ?? initialHeapMiB) - initialHeapMiB,
      ),
      materiallyMonotonic,
      materialStepMiB: MATERIAL_HEAP_STEP_MIB,
      peakGrowthMiB: round(Math.max(...heapMiB) - initialHeapMiB),
      samplesMiB: heapMiB,
    },
    pageTurns: {
      forwardMedianMs: median(forward.durationsMs),
      forwardMs: forward.durationsMs,
      forwardTurnsWithLongFrames: forward.turnsWithLongFrames,
      loafSupported: visibleAfter.loafSupported,
      longAnimationFramesMs: visibleAfter.longAnimationFrames.map(
        (frame) => frame.duration,
      ),
      reducedMedianMs: median(reducedMs),
      reducedMotionMs: reducedMs,
      reverseMedianMs: median(reverse.durationsMs),
      reverseMs: reverse.durationsMs,
      reverseTurnsWithLongFrames: reverse.turnsWithLongFrames,
    },
    rendererActivity,
    traces: {
      pageTurns: turnTraceEvents,
      reducedMotion: reducedTraceEvents,
      stress: stressTraceEvents,
      wallpaperIdle: idleTraceEvents,
    },
    wallpaperFrames: {
      hiddenRafGrowth:
        idleAfter.hiddenRafCallbacks - idleBefore.hiddenRafCallbacks,
      hiddenTransitions:
        idleAfter.hiddenTransitions - idleBefore.hiddenTransitions,
      hiddenWallpaperDrawGrowth:
        idleAfter.hiddenWallpaperDraws - idleBefore.hiddenWallpaperDraws,
      inactiveTabTransitions,
      inactiveTabWallpaperDrawGrowth:
        idleAfter.inactiveTabWallpaperDraws -
        idleBefore.inactiveTabWallpaperDraws,
      inactiveWallpaperDrawGrowth:
        visibleAfter.inactiveWallpaperDraws -
        visibleBefore.inactiveWallpaperDraws,
      idleRafGrowth: idleAfter.rafCallbacks - idleBefore.rafCallbacks,
      visibleFrameGrowth:
        visibleAfter.rafCallbacks - visibleBefore.rafCallbacks,
      visibleWallpaperDrawGrowth:
        visibleAfter.activeWallpaperDraws - visibleBefore.activeWallpaperDraws,
    },
  }
}
