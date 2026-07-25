import { expect, test } from "./extension.fixture"

test("moves and resizes a Widget through the extracted Edit Mode shell", async ({
  extensionContext,
  extensionId,
}) => {
  // Given: the unpacked Home is open in Edit Mode at a stable desktop size
  const page = await extensionContext.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await page.getByRole("button", { name: "编辑", exact: true }).click()
  const widget = page
    .locator('[data-page-id="page_moment"]')
    .first()
    .locator('[data-widget-id="page_moment_w1"]')

  try {
    const initialBox = await widget.boundingBox()
    expect(initialBox).not.toBeNull()
    if (!initialBox) return

    // When: the resize handle and then the Widget body receive pointer drags
    const resizeHandle = widget.locator('div[data-resize-handle="true"]')
    const handleBox = await resizeHandle.boundingBox()
    expect(handleBox).not.toBeNull()
    if (!handleBox) return

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      handleBox.x + handleBox.width / 2 + 96,
      handleBox.y + handleBox.height / 2 + 64,
    )
    await page.mouse.up()

    const resizedBox = await widget.boundingBox()
    expect(resizedBox).not.toBeNull()
    if (!resizedBox) return

    await page.mouse.move(
      resizedBox.x + resizedBox.width / 2,
      resizedBox.y + resizedBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      resizedBox.x + resizedBox.width / 2 + 96,
      resizedBox.y + resizedBox.height / 2,
    )
    await page.mouse.up()

    const movedBox = await widget.boundingBox()
    expect(movedBox).not.toBeNull()
    if (!movedBox) return

    // Then: movement and growth are observable through the live Layout
    expect(resizedBox.width).toBeGreaterThan(initialBox.width + 20)
    expect(resizedBox.height).toBeGreaterThan(initialBox.height + 10)
    expect(movedBox.x).toBeGreaterThan(resizedBox.x + 20)
    expect(movedBox.y).toBeCloseTo(resizedBox.y, 0)
  } finally {
    await page.evaluate("chrome.storage.local.clear()")
    await page.close()
  }
})
