import { resolve } from "node:path"
import type { Locator, Page, TestInfo } from "@playwright/test"
import { expect, test } from "./extension.fixture"

const SAFE_MARGIN_RATIO = 0.03
const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
] as const

type Viewport = (typeof VIEWPORTS)[number]

async function openFreshHome(
  page: Page,
  extensionId: string,
  viewport: Viewport,
): Promise<void> {
  await page.setViewportSize(viewport)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        current: {
          temperature_2m: 22,
          weather_code: 1,
          wind_speed_10m: 8,
        },
      }),
    }),
  )
  await page.route("https://v1.hitokoto.cn/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        hitokoto: "天行健，君子以自强不息。",
        from: "周易",
      }),
    }),
  )
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await page.evaluate("chrome.storage.local.clear()")
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.evaluate(() => document.fonts.ready)
  await expect(
    page.getByRole("button", { name: "此刻", exact: true }),
  ).toHaveAttribute("aria-current", "true")
}

async function activeScene(page: Page, pageId: string): Promise<Locator> {
  const candidates = page.locator(`[data-page-id="${pageId}"]`)
  let activeIndex = -1
  await expect
    .poll(async () => {
      const count = await candidates.count()
      for (let index = 0; index < count; index += 1) {
        const box = await candidates.nth(index).boundingBox()
        if (box && Math.abs(box.y) < 1) {
          activeIndex = index
          return true
        }
      }
      return false
    })
    .toBe(true)
  return candidates.nth(activeIndex)
}

async function widgetBox(scene: Locator, widgetId: string) {
  const box = await scene
    .locator(`[data-widget-id="${widgetId}"]`)
    .boundingBox()
  if (!box) throw new TypeError(`Missing visible Widget: ${widgetId}`)
  return box
}

async function expectSafeMargin(
  scene: Locator,
  widgetIds: readonly string[],
  viewport: Viewport,
): Promise<void> {
  const tolerance = 0.75
  for (const widgetId of widgetIds) {
    const box = await widgetBox(scene, widgetId)
    expect(box.x).toBeGreaterThanOrEqual(
      viewport.width * SAFE_MARGIN_RATIO - tolerance,
    )
    expect(box.y).toBeGreaterThanOrEqual(
      viewport.height * SAFE_MARGIN_RATIO - tolerance,
    )
    expect(box.x + box.width).toBeLessThanOrEqual(
      viewport.width * (1 - SAFE_MARGIN_RATIO) + tolerance,
    )
    expect(box.y + box.height).toBeLessThanOrEqual(
      viewport.height * (1 - SAFE_MARGIN_RATIO) + tolerance,
    )
  }
}

async function expectMomentComposition(
  scene: Locator,
  viewport: Viewport,
): Promise<void> {
  const weather = await widgetBox(scene, "page_moment_w0")
  const clock = await widgetBox(scene, "page_moment_w1")
  const search = await widgetBox(scene, "page_moment_w2")
  const shortcuts = await widgetBox(scene, "page_moment_w3")

  expect(Math.abs(weather.y - clock.y)).toBeLessThan(1)
  expect(
    Math.max(weather.y + weather.height, clock.y + clock.height),
  ).toBeLessThanOrEqual(viewport.height * 0.2)
  expect(clock.x).toBeLessThan(weather.x)
  expect((clock.x + weather.x + weather.width) / 2).toBeCloseTo(
    viewport.width / 2,
    0,
  )
  expect(search.x + search.width / 2).toBeCloseTo(viewport.width / 2, 0)
  expect(
    (search.y + search.height / 2) / viewport.height,
  ).toBeGreaterThanOrEqual(0.34)
  expect((search.y + search.height / 2) / viewport.height).toBeLessThan(0.5)
  expect(
    (shortcuts.y + shortcuts.height) / viewport.height,
  ).toBeGreaterThanOrEqual(0.92)
}

async function expectMuseComposition(
  scene: Locator,
  viewport: Viewport,
): Promise<void> {
  const quote = await widgetBox(scene, "page_muse_w0")
  const hexagram = await widgetBox(scene, "page_muse_w1")

  expect((quote.y + quote.height / 2) / viewport.height).toBeLessThan(0.45)
  expect(quote.width / viewport.width).toBeLessThanOrEqual(0.56)
  expect(
    (hexagram.x + hexagram.width / 2) / viewport.width,
  ).toBeGreaterThanOrEqual(0.72)
  expect((hexagram.y + hexagram.height / 2) / viewport.height).toBeGreaterThan(
    0.68,
  )
}

async function expectFlowComposition(
  scene: Locator,
  viewport: Viewport,
): Promise<void> {
  const clock = await widgetBox(scene, "page_flow_w0")

  expect(clock.width / viewport.width).toBeGreaterThanOrEqual(0.72)
  expect(clock.height / viewport.height).toBeGreaterThanOrEqual(0.42)
  expect((clock.y + clock.height / 2) / viewport.height).toBeGreaterThanOrEqual(
    0.38,
  )
  expect((clock.y + clock.height / 2) / viewport.height).toBeLessThanOrEqual(
    0.44,
  )
}

const SCENES = [
  {
    id: "page_moment",
    name: "此刻",
    widgetIds: [
      "page_moment_w0",
      "page_moment_w1",
      "page_moment_w2",
      "page_moment_w3",
    ],
    expectComposition: expectMomentComposition,
  },
  {
    id: "page_muse",
    name: "灵感",
    widgetIds: ["page_muse_w0", "page_muse_w1"],
    expectComposition: expectMuseComposition,
  },
  {
    id: "page_flow",
    name: "流光",
    widgetIds: ["page_flow_w0"],
    expectComposition: expectFlowComposition,
  },
] as const

type SceneCapture = {
  readonly page: Page
  readonly testInfo: TestInfo
  readonly viewport: Viewport
  readonly sceneId: string
}

async function captureScene(input: SceneCapture): Promise<void> {
  const evidencePath = resolve(
    __dirname,
    `../../.omo/evidence/v0.2.0-liquid-glass-completion/task-15/default-home-${input.viewport.width}x${input.viewport.height}-${input.sceneId}.png`,
  )
  await input.page.screenshot({ animations: "disabled", path: evidencePath })
  await input.testInfo.attach(
    `default-home-${input.viewport.width}x${input.viewport.height}-${input.sceneId}.png`,
    {
      path: evidencePath,
      contentType: "image/png",
    },
  )
}

for (const viewport of VIEWPORTS) {
  test(`first-open default Home matches all three compositions at ${viewport.width}x${viewport.height}`, async ({
    extensionContext,
    extensionId,
  }, testInfo) => {
    // Given: empty Extension storage and the approved desktop viewport
    const page = await extensionContext.newPage()
    await openFreshHome(page, extensionId, viewport)

    for (const sceneContract of SCENES) {
      // When: the user selects each Page in the default sequence
      const dot = page.getByRole("button", {
        name: sceneContract.name,
        exact: true,
      })
      await dot.click()
      await expect(dot).toHaveAttribute("aria-current", "true")
      const scene = await activeScene(page, sceneContract.id)

      // Then: the rendered composition and every Widget honor DESIGN.md bands and 3% margin
      await expect(scene).toHaveAttribute("aria-label", sceneContract.name)
      await expectSafeMargin(scene, sceneContract.widgetIds, viewport)
      await sceneContract.expectComposition(scene, viewport)
      await captureScene({
        page,
        testInfo,
        viewport,
        sceneId: sceneContract.id,
      })
    }

    await page.close()
  })
}

test("corrupt stored Home resets to the same three-scene landing contract", async ({
  extensionContext,
  extensionId,
}) => {
  // Given: invalid persisted Home data
  const page = await extensionContext.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(
    page.getByRole("button", { name: "此刻", exact: true }),
  ).toBeVisible()
  await page.evaluate(
    "chrome.storage.local.set({'yindex.home': {'schemaVersion': 999}})",
  )

  // When: Home reloads through the real storage migration seam
  await page.reload()

  // Then: it recovers to 此刻 / 灵感 / 流光 and lands on 此刻
  await expect(
    page.getByRole("button", { name: "此刻", exact: true }),
  ).toHaveAttribute("aria-current", "true")
  await expect(
    page.getByRole("button", { name: "灵感", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "流光", exact: true }),
  ).toBeVisible()
  const moment = await activeScene(page, "page_moment")
  await expect(moment).toHaveAttribute("aria-label", "此刻")
  await page.close()
})
