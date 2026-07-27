import { randomUUID } from "node:crypto"
import { mkdir, open, readdir, rename, rm } from "node:fs/promises"
import { resolve } from "node:path"
import type { BrowserContext, Locator, Page, TestInfo } from "@playwright/test"
import { expect } from "./extension.fixture"

export const EVIDENCE_ROOT = resolve(
  __dirname,
  "../../.omo/evidence/v0.2.0-liquid-glass-completion/task-25",
)
export const SCREENSHOT_ROOT = resolve(EVIDENCE_ROOT, "screenshots")
export const BRIGHT_FIXTURE = resolve(
  __dirname,
  "../fixtures/wallpapers/bright.png",
)
export const DARK_FIXTURE = resolve(
  __dirname,
  "../fixtures/wallpapers/dark.png",
)

const FIXED_TIME = new Date("2026-07-26T08:08:00+08:00")
const EVIDENCE_LOCK_PATH = resolve(EVIDENCE_ROOT, ".visual-suite.lock")
const GENERATED_EVIDENCE = [
  "screenshots",
  "matrix.md",
  "contrast-samples.json",
  "axe-default-moment.json",
  "axe-default-muse.json",
  "axe-default-flow.json",
  "axe-dark-deep-flow.json",
] as const

type VisualHomeOptions = {
  readonly controlledClock?: boolean
}

class VisualEvidenceLockError extends Error {
  override readonly name = "VisualEvidenceLockError"

  constructor(readonly lockPath: string) {
    super(
      `Another visual evidence suite owns ${lockPath}. Wait for it to finish before starting a new run.`,
    )
  }
}

const CLEAR_EXTENSION_STATE = `(async () => {
  await chrome.storage.local.clear()
  const root = await navigator.storage?.getDirectory?.()
  try {
    await root?.removeEntry("yindex-wallpaper-media", { recursive: true })
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "NotFoundError") throw error
  }
})()`

export async function openVisualHome(
  context: BrowserContext,
  extensionId: string,
  options: VisualHomeOptions = {},
): Promise<Page> {
  await mkdir(SCREENSHOT_ROOT, { recursive: true })
  const page = await context.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  if (options.controlledClock) {
    await page.clock.install({ time: FIXED_TIME })
  } else {
    await page.clock.setFixedTime(FIXED_TIME)
  }
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        current: {
          temperature_2m: 22,
          weather_code: 1,
          wind_speed_10m: 8,
        },
      }),
    }),
  )
  await page.route("https://v1.hitokoto.cn/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        hitokoto: "天行健，君子以自强不息。",
        from: "周易",
      }),
    }),
  )
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await page.evaluate(CLEAR_EXTENSION_STATE)
  await page.reload()
  await expect(page.getByRole("button", { name: "设置" })).toBeVisible({
    timeout: 15_000,
  })
  await page.evaluate(() => document.fonts.ready)
  await selectScene(page, "此刻", "page_moment")
  return page
}

export async function resetVisualEvidence(): Promise<void> {
  await mkdir(EVIDENCE_ROOT, { recursive: true })
  const existingNames = new Set(await readdir(EVIDENCE_ROOT))
  const generatedNames = GENERATED_EVIDENCE.filter((name) =>
    existingNames.has(name),
  )
  if (generatedNames.length > 0) {
    const archiveRoot = resolve(
      EVIDENCE_ROOT,
      "attempts",
      `visual-${Date.now()}-${randomUUID()}`,
    )
    await mkdir(archiveRoot, { recursive: true })
    await Promise.all(
      generatedNames.map((name) =>
        rename(resolve(EVIDENCE_ROOT, name), resolve(archiveRoot, name)),
      ),
    )
  }
  await mkdir(SCREENSHOT_ROOT, { recursive: true })
}

export async function acquireVisualEvidenceLock(): Promise<
  () => Promise<void>
> {
  await mkdir(EVIDENCE_ROOT, { recursive: true })
  try {
    const lock = await open(EVIDENCE_LOCK_PATH, "wx")
    await lock.writeFile(`${process.pid}\n`)
    return async () => {
      await lock.close()
      await rm(EVIDENCE_LOCK_PATH, { force: true })
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      throw new VisualEvidenceLockError(EVIDENCE_LOCK_PATH)
    }
    throw error
  }
}

export async function selectScene(
  page: Page,
  name: string,
  pageId: string,
): Promise<Locator> {
  const dot = page.getByRole("button", { name, exact: true })
  await dot.click()
  await expect(dot).toHaveAttribute("aria-current", "true")
  const scene = page.locator(
    `[data-page-slot-active="true"] [data-page-id="${pageId}"]`,
  )
  await expect(scene).toBeVisible({ timeout: 15_000 })
  await expect(scene).toHaveAttribute("data-analysis-ready", "true", {
    timeout: 15_000,
  })
  return scene
}

export async function captureEvidence(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<string> {
  const path = resolve(SCREENSHOT_ROOT, name)
  await page.screenshot({
    animations: "disabled",
    path,
    scale: "css",
  })
  await testInfo.attach(name, { path, contentType: "image/png" })
  return path
}

export async function openEdit(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "编辑", exact: true }).click()
  const panel = page.locator('aside[aria-label="编辑面板"]')
  await expect(panel).toBeVisible()
  return panel
}

export async function closeEdit(panel: Locator): Promise<void> {
  await panel.getByRole("button", { name: "完成", exact: true }).click()
  await expect(panel).toBeHidden()
}

export async function selectGlassProfile(
  panel: Locator,
  name: "清透" | "均衡" | "沉静",
): Promise<void> {
  const button = panel.getByRole("button", { name, exact: true })
  await button.click()
  await expect(button).toHaveAttribute("aria-pressed", "true")
}

export async function uploadWallpaper(
  panel: Locator,
  fixturePath: string,
): Promise<void> {
  const input = panel.locator('input[accept="image/*,video/*"]')
  await expect(input).toBeEnabled({ timeout: 15_000 })
  await input.setInputFiles(fixturePath)
  const page = panel.page()
  await expect(
    page.locator(
      '[data-page-slot-active="true"] [data-wallpaper-kind="image"][data-wallpaper-active="true"]',
    ),
  ).toBeVisible({ timeout: 15_000 })
}
