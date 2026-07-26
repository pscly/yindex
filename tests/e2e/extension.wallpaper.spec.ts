import { resolve } from "node:path"
import { expect, test } from "./extension.fixture"

const WALLPAPER_FIXTURE = resolve(
  __dirname,
  "../fixtures/wallpapers/bright.png",
)

test("renders the default Home with a painted generative Wallpaper canvas", async ({
  extensionContext,
  extensionId,
}) => {
  // Given: a clean unpacked Extension profile with the default Home
  const page = await extensionContext.newPage()

  // When: the packaged new-tab entry renders its active Page
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  const stage = page
    .locator('[data-wallpaper-kind="generative"][data-wallpaper-active="true"]')
    .first()
  const canvas = stage.locator("canvas")

  // Then: WallpaperStage mounts a real, painted canvas instead of only CSS fallback
  await expect(stage).toBeVisible()
  await expect(canvas).toBeVisible()
  const paint = await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) return null
    const context = element.getContext("2d")
    const x = Math.max(0, Math.floor(element.width / 2))
    const y = Math.max(0, Math.floor(element.height / 2))
    return {
      alpha: context?.getImageData(x, y, 1, 1).data[3] ?? 0,
      height: element.height,
      width: element.width,
    }
  })
  expect(paint?.width).toBeGreaterThan(1)
  expect(paint?.height).toBeGreaterThan(1)
  expect(paint?.alpha).toBeGreaterThan(0)
})

test("opens Settings from the missing Wallpaper recovery control by keyboard and pointer", async ({
  extensionContext,
  extensionId,
}) => {
  // Given: a stored image Wallpaper whose OPFS media is later removed
  const page = await extensionContext.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  const recoveryName = "壁纸缺失 · 打开设置重新选择"
  await expect(page.getByRole("button", { name: recoveryName })).toHaveCount(0)

  await page.getByRole("button", { name: "编辑", exact: true }).click()
  await page
    .locator('aside[aria-label="编辑面板"] input[accept="image/*,video/*"]')
    .setInputFiles(WALLPAPER_FIXTURE)
  const wallpaper = page.locator(
    '[data-page-slot-active="true"] [data-wallpaper-kind="image"][data-wallpaper-active="true"]',
  )
  await expect(wallpaper).not.toHaveAttribute("data-wallpaper-fallback", "true")
  await expect(page.getByRole("button", { name: recoveryName })).toHaveCount(0)
  await page.getByRole("button", { name: "完成", exact: true }).click()

  await page.evaluate(async () => {
    const root = await navigator.storage?.getDirectory?.()
    if (root === undefined) throw new Error("OPFS is unavailable")
    try {
      await root.removeEntry("yindex-wallpaper-media", { recursive: true })
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "NotFoundError") {
        throw error
      }
    }
  })

  // When: the Home reloads and keyboard focus reaches the fallback action
  await page.reload()
  const fallback = page.locator(
    '[data-page-slot-active="true"] [data-wallpaper-fallback="true"]',
  )
  const recovery = fallback.getByRole("button", { name: recoveryName })
  await expect(fallback).toBeVisible()
  await expect(recovery).toBeVisible()
  await page.keyboard.press("Tab")
  await expect(recovery).toBeFocused()
  await page.keyboard.press("Enter")

  // Then: Enter and pointer activation both open the existing Settings dialog
  const settings = page.getByRole("dialog", { name: "设置" })
  await expect(settings).toBeVisible()
  await settings.getByRole("button", { name: "关闭", exact: true }).click()
  await expect(recovery).toBeFocused()
  await recovery.click()
  await expect(settings).toBeVisible()
})
