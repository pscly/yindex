import { expect, test } from "./extension.fixture"

test("loads the MV3 Extension service worker from the unpacked dist", async ({
  extensionId,
}) => {
  // Given: the per-worker persistent Chromium context loaded the unpacked dist
  // When: the harness resolves the MV3 service worker URL
  // Then: it exposes the Chrome-assigned Extension ID
  expect(extensionId).toMatch(/^[a-p]{32}$/)
})

test("renders Home through its direct Extension URL", async ({
  extensionContext,
  extensionId,
}) => {
  // Given: the unpacked Extension has a resolved MV3 ID
  const page = await extensionContext.newPage()
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text())
  })

  // When: the Home entry is opened directly on the Extension origin
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)

  // Then: the Home shell renders without page-level errors
  await expect(page).toHaveTitle(/yindex/)
  await expect(page.locator("#root")).not.toBeEmpty()
  expect(runtimeErrors).toEqual([])
})

test("replaces the real Chromium new tab page", async ({
  extensionContext,
  extensionId,
}) => {
  // Given: Chromium launched with the unpacked newtab override
  const page = await extensionContext.newPage()

  // When: Chromium's internal new-tab URL is opened
  await page.goto("chrome://newtab/")

  // Then: Chromium resolves it to this Extension's Home entry
  await expect(page).toHaveURL(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.locator("#root")).not.toBeEmpty()
})
