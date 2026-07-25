import { expect, test } from "./extension.fixture"

test("contains the compact clock after local Noto fonts settle at 375 px", async ({
  extensionContext,
  extensionId,
}) => {
  // Given: the unpacked Home at the narrow supported visual-QA width
  const page = await extensionContext.newPage()
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await page.evaluate(() => document.fonts.ready)

  // When: the visible compact clock is measured with its final local font
  const clock = page
    .locator("[data-page-id=page_moment]")
    .first()
    .locator("[data-widget-id=page_moment_w1]")
  const containment = await clock.evaluate((root) => {
    const surface = root.querySelector<HTMLElement>("[data-widget-surface]")
    return surface
      ? {
          clientHeight: surface.clientHeight,
          scrollHeight: surface.scrollHeight,
        }
      : null
  })

  // Then: no clock content is clipped by the fixed Widget boundary
  expect(containment).not.toBeNull()
  expect(containment?.scrollHeight).toBeLessThanOrEqual(
    containment?.clientHeight ?? 0,
  )
})
