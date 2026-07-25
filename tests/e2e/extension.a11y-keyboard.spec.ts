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

  try {
    // Wait until Home is interactive and host can receive keys
    const settingsButton = page.getByRole("button", { name: "设置" })
    await expect(settingsButton).toBeVisible({ timeout: 15_000 })
    await expect(
      page.locator('[data-page-id="page_moment"]').first(),
    ).toBeVisible()

    // Focus the page chrome so window keydown host receives PageDown
    await settingsButton.focus()
    await page.keyboard.press("PageDown")
    await expect(
      page.locator('[data-page-slot-active="true"] [data-page-id="page_muse"]'),
    ).toBeVisible({ timeout: 15_000 })
    await page.keyboard.press("1")
    const activePage = page.locator(
      '[data-page-slot-active="true"] [data-page-id="page_moment"]',
    )
    await expect(activePage).toBeVisible({ timeout: 15_000 })

    const inactiveSlots = page.locator('[data-page-slot-active="false"]')
    expect(
      await inactiveSlots.evaluateAll(
        (slots) =>
          slots.length > 0 && slots.every((slot) => slot.hasAttribute("inert")),
      ),
    ).toBe(true)

    // Settings keyboard journey
    await tabTo(page, settingsButton)
    await expect(settingsButton).toBeFocused()
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

    // Edit Mode + gesture alternatives (weather = page_moment_w0)
    const editButton = page.getByRole("button", { name: "编辑", exact: true })
    await tabTo(page, editButton)
    await page.keyboard.press("Enter")

    const weather = activePage.locator('[data-widget-id="page_moment_w0"]')
    await weather.click()
    const layoutShell = weather.getByLabel("编辑小组件布局")
    await expect(layoutShell).toBeVisible()
    await layoutShell.focus()
    await expect(layoutShell).toBeFocused()
    await expect(page.getByRole("button", { name: "缩小小组件" })).toBeVisible()
    const growButton = page.getByRole("button", { name: "增大小组件" })
    await expect(growButton).toBeVisible()

    const initialBox = await layoutShell.boundingBox()
    expect(initialBox).not.toBeNull()
    await page.keyboard.press("Shift+ArrowRight")
    await expect
      .poll(async () => (await layoutShell.boundingBox())?.x ?? 0, {
        timeout: 10_000,
      })
      .toBeGreaterThan((initialBox?.x ?? 0) + 40)

    const movedBox = await layoutShell.boundingBox()
    await growButton.focus()
    await page.keyboard.press("Enter")
    await expect
      .poll(async () => (await layoutShell.boundingBox())?.width ?? 0, {
        timeout: 10_000,
      })
      .toBeGreaterThan(movedBox?.width ?? 0)

    // Optional config path if visible (weather selected)
    const cityLabel = page.getByRole("textbox", { name: "城市标签" })
    if (await cityLabel.isVisible().catch(() => false)) {
      await cityLabel.click()
      await cityLabel.fill("键盘配置")
      await expect(cityLabel).toHaveValue("键盘配置")
    }

    // Edit mode disables wheel turn
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
    try {
      if (!page.isClosed()) {
        await page.evaluate("chrome.storage.local.clear()")
        await page.close()
      }
    } catch {
      // ignore
    }
  }
})
