import type { Locator, Page } from "@playwright/test"
import { expect, test } from "./extension.fixture"

type HorizontalDrag = {
  readonly page: Page
  readonly widget: Locator
  readonly deltaX: number
  readonly altKey: boolean
}

async function dragWidgetHorizontally(input: HorizontalDrag): Promise<void> {
  const box = await input.widget.boundingBox()
  if (box === null) throw new TypeError("Widget is not visible for dragging")
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  if (input.altKey) await input.page.keyboard.down("Alt")
  try {
    await input.page.mouse.move(x, y)
    await input.page.mouse.down()
    await input.page.mouse.move(x + input.deltaX, y)
    await input.page.mouse.up()
  } finally {
    if (input.altKey) await input.page.keyboard.up("Alt")
  }
}

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

test("snaps a dragged Widget to a peer edge and lets Alt preserve the free position", async ({
  extensionContext,
  extensionId,
}) => {
  // Given: the default 此刻 clock starts at x=25% with Snap enabled
  const page = await extensionContext.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await page.evaluate("chrome.storage.local.clear()")
  await page.reload()
  await page.getByRole("button", { name: "编辑", exact: true }).click()
  const widget = page.locator(
    '[data-page-slot-active="true"] [data-widget-id="page_moment_w1"]',
  )

  try {
    // When: the clock is released within the weather Widget's x=53% Snap threshold
    await dragWidgetHorizontally({
      page,
      widget,
      deltaX: 352.64,
      altKey: false,
    })

    // Then: its left edge aligns exactly with the peer Widget edge
    const snappedBox = await widget.boundingBox()
    if (snappedBox === null)
      throw new TypeError("Snapped Widget is not visible")
    expect(snappedBox.x / 12.8).toBeCloseTo(53, 1)

    // When: the same near-guide movement is made while Alt disables Snap
    await dragWidgetHorizontally({
      page,
      widget,
      deltaX: -6.4,
      altKey: true,
    })

    // Then: the free 52.5% position remains distinct and persists across reload
    const freeBox = await widget.boundingBox()
    if (freeBox === null)
      throw new TypeError("Alt-dragged Widget is not visible")
    expect(freeBox.x / 12.8).toBeCloseTo(52.5, 1)
    await expect
      .poll(() =>
        page.evaluate<number>(`(async () => {
          const stored = await chrome.storage.local.get("yindex.home")
          const widget = stored["yindex.home"].pages.page_moment.widgets
            .find((candidate) => candidate.id === "page_moment_w1")
          if (!widget) throw new Error("Clock Widget was not persisted")
          return widget.layout.x
        })()`),
      )
      .toBeCloseTo(52.5, 1)

    await page.reload()
    await expect(
      page.getByRole("button", { name: "编辑", exact: true }),
    ).toBeVisible()
    const reloadedBox = await widget.boundingBox()
    if (reloadedBox === null)
      throw new TypeError("Reloaded Widget is not visible")
    expect(reloadedBox.x / 12.8).toBeCloseTo(52.5, 1)
  } finally {
    await page.evaluate("chrome.storage.local.clear()")
    await page.close()
  }
})
