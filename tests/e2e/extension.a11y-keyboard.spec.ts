import type { Locator, Page } from "@playwright/test"
import { expect, test } from "./extension.fixture"

async function tabTo(page: Page, target: Locator, maxTabs = 40): Promise<void> {
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press("Tab")
    if (
      await target
        .evaluate((element) => element === document.activeElement)
        .catch(() => false)
    ) {
      return
    }
  }
  throw new Error("keyboard focus did not reach the requested control")
}

test("drives Page Turn, Settings, and Edit Mode through the keyboard", async ({
  extensionContext,
  extensionId,
}) => {
  test.setTimeout(60_000)
  const page = await extensionContext.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole("button", { name: "设置" })).toBeVisible()

  try {
    // Given: Home is ready for keyboard Page Turn.
    await page.keyboard.press("PageDown")
    await expect(
      page.locator('[data-page-slot-active="true"] [data-page-id="page_muse"]'),
    ).toBeVisible({ timeout: 10_000 })
    await page.keyboard.press("1")
    const activePage = page.locator(
      '[data-page-slot-active="true"] [data-page-id="page_moment"]',
    )
    await expect(activePage).toBeVisible()

    const inactiveSlots = page.locator('[data-page-slot-active="false"]')
    await expect(inactiveSlots.first()).toBeAttached()
    expect(
      await inactiveSlots.evaluateAll((slots) =>
        slots.every((slot) => slot.hasAttribute("inert")),
      ),
    ).toBe(true)

    // When: Settings is opened, traversed, and dismissed with the keyboard.
    const settingsButton = page.getByRole("button", { name: "设置" })
    await tabTo(page, settingsButton)
    await page.keyboard.press("Enter")
    const settingsDialog = page.getByRole("dialog", { name: "设置" })
    await expect(settingsDialog).toHaveAttribute("aria-modal", "true")
    await expect(
      settingsDialog.locator('[data-settings-initial-focus="true"]'),
    ).toBeFocused()
    await page.keyboard.press("Tab")
    await expect
      .poll(() =>
        settingsDialog.evaluate(
          (dialog) =>
            document.activeElement !== null &&
            dialog.contains(document.activeElement),
        ),
      )
      .toBe(true)
    await page.keyboard.press("Escape")
    await expect(settingsDialog).toBeHidden()
    await expect(settingsButton).toBeFocused()

    // When: Edit Mode selects Weather and exposes keyboard layout alternatives.
    const editButton = page.getByRole("button", { name: "编辑", exact: true })
    await tabTo(page, editButton)
    await page.keyboard.press("Enter")

    const weather = activePage.locator('[data-widget-id="page_moment_w0"]')
    await weather.click()
    const layoutShell = weather.getByLabel("编辑小组件布局")
    await expect(layoutShell).toBeVisible()
    await layoutShell.focus()
    await expect(layoutShell).toBeFocused()
    await expect(
      weather.getByRole("button", { name: "缩小小组件" }),
    ).toBeVisible()
    const growButton = weather.getByRole("button", { name: "增大小组件" })
    await expect(growButton).toBeVisible()

    const initialBox = await layoutShell.boundingBox()
    expect(initialBox).not.toBeNull()
    await page.keyboard.press("Shift+ArrowRight")
    await expect
      .poll(async () => (await layoutShell.boundingBox())?.x ?? 0)
      .toBeGreaterThan((initialBox?.x ?? 0) + 40)

    const beforeGrow = await layoutShell.boundingBox()
    expect(beforeGrow).not.toBeNull()
    await growButton.focus()
    await page.keyboard.press("Enter")
    await expect
      .poll(async () => (await layoutShell.boundingBox())?.width ?? 0)
      .toBeGreaterThan(beforeGrow?.width ?? 0)

    // Then: Weather configuration remains keyboard-editable without a Tab hunt.
    const cityLabel = page.getByRole("textbox", { name: "城市标签" })
    await expect(cityLabel).toBeVisible()
    await cityLabel.focus()
    await expect(cityLabel).toBeFocused()
    await cityLabel.fill("键盘配置")
    await expect(cityLabel).toHaveValue("键盘配置")

    // Then: Edit Mode consumes wheel input and Escape restores Browse Mode.
    await page.mouse.wheel(0, 900)
    await expect(activePage).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(
      page.getByRole("button", { name: "编辑", exact: true }),
    ).toBeVisible()
    await expect(page.getByLabel("编辑小组件布局")).toHaveCount(0)
    await expect(
      page.locator('[data-page-slot-active="false"] :focus'),
    ).toHaveCount(0)
  } finally {
    if (!page.isClosed()) {
      try {
        await page.evaluate("chrome.storage.local.clear()")
      } finally {
        await page.close()
      }
    }
  }
})
