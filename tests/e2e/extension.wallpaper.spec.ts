import { expect, test } from "./extension.fixture"

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
