import { mkdir } from "node:fs/promises"
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
): Promise<Page> {
  await mkdir(SCREENSHOT_ROOT, { recursive: true })
  const page = await context.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.clock.setFixedTime(new Date("2026-07-26T08:08:00+08:00"))
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
  await panel
    .locator('input[accept="image/*,video/*"]')
    .setInputFiles(fixturePath)
  const page = panel.page()
  await expect(
    page.locator(
      '[data-page-slot-active="true"] [data-wallpaper-kind="image"][data-wallpaper-active="true"]',
    ),
  ).toBeVisible({ timeout: 15_000 })
}
