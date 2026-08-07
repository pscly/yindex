import { resolve } from "node:path"
import { PNG } from "pngjs"
import { expect, test } from "./extension.fixture"
import { installWallpaperCanvasInstrumentation } from "./extension.wallpaper-canvas-instrumentation.helpers"

const WALLPAPER_FIXTURE = resolve(
  __dirname,
  "../fixtures/wallpapers/bright.png",
)

test("renders the landing 此刻 with the bundled image Wallpaper", async ({
  extensionContext,
  extensionId,
}) => {
  // Given: a clean unpacked Extension profile; first launch seeds the bundled
  // 蓝天白云 image into the local media store and assigns it to 此刻
  const page = await extensionContext.newPage()

  // When
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  const stage = page
    .locator('[data-wallpaper-kind="image"][data-wallpaper-active="true"]')
    .first()

  // Then: the bundled image actually decoded and painted
  await expect(stage).toBeVisible({ timeout: 15_000 })
  const img = stage.locator("img")
  await expect(img).toHaveCount(1)
  const decoded = await img.evaluate((element) =>
    element instanceof HTMLImageElement
      ? { width: element.naturalWidth, height: element.naturalHeight }
      : null,
  )
  expect(decoded?.width).toBeGreaterThan(1)
  expect(decoded?.height).toBeGreaterThan(1)

  // And: the composited stage shows a painted, non-uniform Wallpaper
  const bounds = await stage.boundingBox()
  if (bounds === null) throw new Error("active Wallpaper stage has no bounds")
  const screenshot = await page.screenshot({ clip: bounds })
  const png = PNG.sync.read(screenshot)
  const colors = new Set<number>()
  for (let pixel = 0; pixel < png.width * png.height; pixel += 1) {
    const offset = pixel * 4
    const r = png.data[offset] ?? 0
    const g = png.data[offset + 1] ?? 0
    const b = png.data[offset + 2] ?? 0
    const a = png.data[offset + 3] ?? 0
    colors.add(((r << 24) | (g << 16) | (b << 8) | a) >>> 0)
  }
  expect(colors.size).toBeGreaterThan(16)
})

test("renders a generative scene Page with a painted Wallpaper canvas", async ({
  extensionContext,
  extensionId,
}) => {
  // Given: a clean unpacked Extension profile with the default Home;
  // 灵感 (one Page Turn down from the landing) keeps a generative Wallpaper
  const page = await extensionContext.newPage()
  await page.addInitScript(installWallpaperCanvasInstrumentation)

  // When: the packaged new-tab entry renders its active Page
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  const dot = page.getByRole("button", { name: "灵感", exact: true })
  await dot.click()
  await expect(dot).toHaveAttribute("aria-current", "true", { timeout: 15_000 })
  const stage = page
    .locator('[data-wallpaper-kind="generative"][data-wallpaper-active="true"]')
    .first()

  // Then: exactly one of the two stacked surfaces is visible with real pixels
  await expect(stage).toBeVisible()
  await expect(stage.locator("canvas[data-wallpaper-surface]")).toHaveCount(2)
  const visibleSurface = stage.locator(
    'canvas[data-wallpaper-surface-visible="true"]',
  )
  await expect(visibleSurface).toHaveCount(1)
  await expect(visibleSurface).toBeVisible()
  await expect(
    stage.locator(
      "canvas[data-wallpaper-surface]:not([data-wallpaper-surface-visible])",
    ),
  ).toBeHidden()
  const size = await visibleSurface.evaluate((element) =>
    element instanceof HTMLCanvasElement
      ? { height: element.height, width: element.width }
      : null,
  )
  expect(size?.width).toBeGreaterThan(1)
  expect(size?.height).toBeGreaterThan(1)

  // And: the composited stage shows a painted, non-uniform Wallpaper
  const bounds = await stage.boundingBox()
  if (bounds === null) throw new Error("active Wallpaper stage has no bounds")
  const screenshot = await page.screenshot({ clip: bounds })
  const png = PNG.sync.read(screenshot)
  const colors = new Set<number>()
  for (let pixel = 0; pixel < png.width * png.height; pixel += 1) {
    const offset = pixel * 4
    const r = png.data[offset] ?? 0
    const g = png.data[offset + 1] ?? 0
    const b = png.data[offset + 2] ?? 0
    const a = png.data[offset + 3] ?? 0
    colors.add(((r << 24) | (g << 16) | (b << 8) | a) >>> 0)
  }
  expect(colors.size).toBeGreaterThan(16)

  // And: every surface was revealed only after a draw landed on that same canvas
  const sequence = await page.evaluate(() => window.__revealSequence ?? [])
  expect(sequence.length).toBeGreaterThan(0)
  const revealedCanvasIds = [
    ...new Set(
      sequence.filter((event) => event.kind === "visible").map((e) => e.canvas),
    ),
  ]
  expect(revealedCanvasIds.length).toBeGreaterThan(0)
  for (const canvasId of revealedCanvasIds) {
    const firstDraw = sequence.findIndex(
      (event) => event.kind === "draw" && event.canvas === canvasId,
    )
    const firstReveal = sequence.findIndex(
      (event) => event.kind === "visible" && event.canvas === canvasId,
    )
    expect(firstDraw).toBeGreaterThanOrEqual(0)
    expect(firstReveal).toBeGreaterThan(firstDraw)
  }
  expect(
    sequence.filter(
      (event) => event.kind === "visible" && event.role === "canvas2d",
    ),
  ).toEqual([])

  // And: every mounted generative stage shows exactly one of its two stacked surfaces
  const perStage = await page.evaluate(() =>
    [...document.querySelectorAll('[data-wallpaper-kind="generative"]')].map(
      (stage) => ({
        surfaces: stage.querySelectorAll("canvas[data-wallpaper-surface]")
          .length,
        visible: stage.querySelectorAll(
          'canvas[data-wallpaper-surface-visible="true"]',
        ).length,
      }),
    ),
  )
  for (const stage of perStage) {
    expect(stage.surfaces).toBe(2)
    expect(stage.visible).toBe(1)
  }

  // And: neither stacked canvas ever received the other backend's context request
  const requests = await page.evaluate(
    () => window.__canvasContextRequests ?? [],
  )
  for (const request of requests) {
    if (request.role === "webgl2") expect(request.contextId).toBe("webgl2")
    if (request.role === "canvas2d") expect(request.contextId).toBe("2d")
  }
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
  const upload = page.locator(
    'aside[aria-label="编辑面板"] input[accept="image/*,video/*"]',
  )
  await expect(upload).toBeEnabled()
  await upload.setInputFiles(WALLPAPER_FIXTURE)
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
