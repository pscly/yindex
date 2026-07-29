import type { Page } from "@playwright/test"
import { expect } from "./extension.fixture"

const HOME_READY_TIMEOUT_MS = 15_000

export type RendererActivity = {
  readonly activeCanvasCount: number
  readonly activeWallpaperCount: number
  readonly inactiveReducedMotionCount: number
  readonly inactiveWallpaperCount: number
}

export async function waitForProfiledHome(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "设置" })).toBeVisible({
    timeout: HOME_READY_TIMEOUT_MS,
  })
  await expect(
    page.locator('[data-page-slot-active="true"] [data-page-id]'),
  ).toBeVisible()
  await expect(
    page.locator(
      '[data-page-slot-active="true"] [data-wallpaper-active="true"]',
    ),
  ).toHaveCount(1)
}

export async function readRendererActivity(
  page: Page,
): Promise<RendererActivity> {
  return page.evaluate(() => {
    const wallpapers = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-wallpaper-kind="generative"]',
      ),
    ]
    const active = wallpapers.filter(
      (wallpaper) => wallpaper.getAttribute("data-wallpaper-active") === "true",
    )
    const inactive = wallpapers.filter(
      (wallpaper) =>
        wallpaper.getAttribute("data-wallpaper-active") === "false",
    )
    return {
      activeCanvasCount: active.reduce(
        (count, wallpaper) =>
          count +
          wallpaper.querySelectorAll(
            'canvas[data-wallpaper-surface-visible="true"]',
          ).length,
        0,
      ),
      activeWallpaperCount: active.length,
      inactiveReducedMotionCount: inactive.filter(
        (wallpaper) =>
          wallpaper.getAttribute("data-wallpaper-reduced-motion") === "true",
      ).length,
      inactiveWallpaperCount: inactive.length,
    }
  })
}
