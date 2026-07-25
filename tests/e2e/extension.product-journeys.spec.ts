import type { Page } from "@playwright/test"
import { expect, test as extensionTest } from "./extension.fixture"

const test = extensionTest.extend<{ readonly productPage: Page }>({
  productPage: async ({ extensionContext, extensionId }, use) => {
    const page = await extensionContext.newPage()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto(`chrome-extension://${extensionId}/newtab.html`)
    await page.evaluate("chrome.storage.local.clear()")
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByRole("button", { name: "设置" })).toBeVisible({
      timeout: 15_000,
    })

    try {
      await use(page)
    } finally {
      if (!page.isClosed()) {
        await page.evaluate("chrome.storage.local.clear()")
        await page.close()
      }
    }
  },
})

async function expectActivePage(
  page: Page,
  pageId: string,
  pageName: string,
): Promise<void> {
  await expect(
    page.locator(`[data-page-slot-active="true"] [data-page-id="${pageId}"]`),
  ).toBeVisible({ timeout: 15_000 })
  await expect(
    page.getByRole("button", { name: pageName, exact: true }),
  ).toHaveAttribute("aria-current", "true")
}

test("browses 此刻, 灵感, and 流光 through PageDots", async ({
  productPage: page,
}) => {
  // Given: a fresh default Home starts on 此刻
  await expectActivePage(page, "page_moment", "此刻")

  // When: the user visits each named Page through the PageDots
  for (const scene of [
    { id: "page_muse", name: "灵感" },
    { id: "page_flow", name: "流光" },
    { id: "page_moment", name: "此刻" },
  ]) {
    await page.getByRole("button", { name: scene.name, exact: true }).click()

    // Then: the selected Page is the active full-screen scene
    await expectActivePage(page, scene.id, scene.name)
  }
})

test("wraps keyboard Page Turns across both Loop edges", async ({
  productPage: page,
}) => {
  // Given: the keyboard host is interactive on the first Page
  const settingsButton = page.getByRole("button", { name: "设置" })
  await settingsButton.focus()
  await expectActivePage(page, "page_moment", "此刻")

  // When: PageDown traverses the sequence and crosses last → first
  await page.keyboard.press("PageDown")
  await expectActivePage(page, "page_muse", "灵感")
  await page.keyboard.press("PageDown")
  await expectActivePage(page, "page_flow", "流光")
  await page.keyboard.press("PageDown")

  // Then: the last Page loops to the first
  await expectActivePage(page, "page_moment", "此刻")

  // When: PageUp crosses first → last
  await page.keyboard.press("PageUp")

  // Then: reverse navigation wraps to 流光
  await expectActivePage(page, "page_flow", "流光")
})

test("persists advanced glass tuning from Settings", async ({
  productPage: page,
}) => {
  // Given: Settings is open on the default 此刻 Page
  await page.getByRole("button", { name: "设置" }).click()
  const dialog = page.getByRole("dialog", { name: "设置" })
  await expect(dialog).toBeVisible()
  await dialog.getByText("高级玻璃微调", { exact: true }).click()
  const slider = dialog.getByLabel("通透", { exact: true })

  // When: the user raises transmission from 0 to 0.12
  await slider.evaluate((element: HTMLInputElement) => {
    Reflect.set(HTMLInputElement.prototype, "value", "0.12", element)
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))
  })

  // Then: the active Page's glass tuning is persisted in Extension storage
  await expect
    .poll(() =>
      page.evaluate<number>(`(async () => {
        const stored = await chrome.storage.local.get("yindex.home")
        return stored["yindex.home"].pages.page_moment.style.glassTuning.transmission
      })()`),
    )
    .toBeCloseTo(0.12, 2)

  await dialog.getByRole("button", { name: "关闭" }).click()
  await expect(dialog).toBeHidden()
})
