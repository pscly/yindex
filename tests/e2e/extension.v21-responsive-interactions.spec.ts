import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import type { Page, TestInfo } from "@playwright/test"
import { expect, test } from "./extension.fixture"

const EVIDENCE = resolve(
  __dirname,
  "../../.omo/evidence/v0.2.0-liquid-glass-completion/task-28-v21-independent-qa",
)

const VIEWPORTS = [
  { width: 1440, height: 900, slug: "1440x900" },
  { width: 1280, height: 800, slug: "1280x800" },
  { width: 390, height: 844, slug: "390x844" },
] as const

async function prepare(page: Page, extensionId: string): Promise<void> {
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        current: { temperature_2m: 22, weather_code: 1, wind_speed_10m: 8 },
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
  await page.reload()
  await expect(page.getByRole("button", { name: "设置" })).toBeVisible({
    timeout: 15_000,
  })
  await page.evaluate(() => document.fonts.ready)
}

async function capture(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  await mkdir(EVIDENCE, { recursive: true })
  const path = resolve(EVIDENCE, name)
  await page.screenshot({ path, animations: "disabled", scale: "css" })
  await testInfo.attach(name, { path, contentType: "image/png" })
}

async function assertVisibleWidgetsStayInViewport(page: Page): Promise<void> {
  const bad = await page
    .locator('[data-page-slot-active="true"] [data-widget-id]')
    .evaluateAll((widgets) =>
      widgets
        .map((widget) => {
          const box = widget.getBoundingClientRect()
          return {
            id: widget.getAttribute("data-widget-id"),
            left: box.left,
            top: box.top,
            right: box.right,
            bottom: box.bottom,
            width: innerWidth,
            height: innerHeight,
          }
        })
        .filter(
          (box) =>
            box.left < -1 ||
            box.top < -1 ||
            box.right > box.width + 1 ||
            box.bottom > box.height + 1,
        ),
    )
  expect(bad).toEqual([])
}

test("v2.1 scenes remain composed, readable, and unclipped at desktop and narrow mobile viewports", async ({
  extensionContext,
  extensionId,
}, testInfo) => {
  test.setTimeout(120_000)
  const page = await extensionContext.newPage()
  try {
    await prepare(page, extensionId)
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport)
      for (const scene of [
        { name: "此刻", id: "page_moment", slug: "moment" },
        { name: "灵感", id: "page_muse", slug: "muse" },
        { name: "流光", id: "page_flow", slug: "flow" },
      ]) {
        const dot = page.getByRole("button", { name: scene.name, exact: true })
        await dot.click()
        await expect(dot).toHaveAttribute("aria-current", "true")
        const active = page.locator(
          `[data-page-slot-active="true"] [data-page-id="${scene.id}"]`,
        )
        await expect(active).toBeVisible()
        await assertVisibleWidgetsStayInViewport(page)
        // Widget internals can intentionally use intrinsic heights and are
        // clipped by their assigned surface; the viewport-bound check above
        // catches visually escaped composition at the scene level.
        await capture(
          page,
          `${viewport.slug}-${scene.slug}-browse.png`,
          testInfo,
        )
      }
    }
  } finally {
    await page.close()
  }
})

test("v2.1 folder, hexagram library, shortcut editor, and reduced motion retain coherent interaction states", async ({
  extensionContext,
  extensionId,
}, testInfo) => {
  test.setTimeout(90_000)
  const page = await extensionContext.newPage()
  try {
    await page.setViewportSize({ width: 1280, height: 800 })
    await prepare(page, extensionId)
    await page.evaluate(async () => {
      const chromeApi = (
        globalThis as unknown as {
          chrome: {
            storage: {
              local: {
                get(key: string): Promise<Record<string, unknown>>
                set(items: Record<string, unknown>): Promise<void>
              }
            }
          }
        }
      ).chrome
      const storage = await chromeApi.storage.local.get("yindex.home")
      const home = storage["yindex.home"] as {
        pages: {
          page_moment?: {
            widgets: Array<{ id: string; config: unknown }>
          }
        }
      }
      const shortcuts = home.pages.page_moment?.widgets.find(
        (widget) => widget.id === "page_moment_w3",
      )
      if (
        !shortcuts ||
        typeof shortcuts.config !== "object" ||
        shortcuts.config === null
      ) {
        throw new Error("default shortcuts config missing")
      }
      const config = shortcuts.config as { items: unknown[] }
      config.items.push({
        id: "qa_folder",
        title: "工作",
        items: [
          { id: "qa_mail", title: "邮件", url: "https://mail.example.com" },
          { id: "qa_docs", title: "文档", url: "https://docs.example.com" },
        ],
      })
      await chromeApi.storage.local.set({ "yindex.home": home })
    })
    await page.reload()
    const folder = page.getByRole("button", {
      name: /工作（文件夹，2 个链接）/,
    })
    await folder.click()
    const dialog = page.getByRole("dialog", { name: "工作" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("link", { name: "邮件" })).toBeVisible()
    await capture(page, "1280x800-moment-folder-open.png", testInfo)
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(folder).toBeFocused()

    await page.getByRole("button", { name: "灵感", exact: true }).click()
    await page.getByRole("button", { name: "打开卦库", exact: true }).click()
    const hexagram = page.locator(
      '[data-page-slot-active="true"] [data-widget-id="page_muse_w1"]',
    )
    await expect(hexagram.getByRole("button")).toHaveCount(66)
    await capture(page, "1280x800-muse-hexagram-library.png", testInfo)

    await page.getByRole("button", { name: "此刻", exact: true }).click()
    await page.getByRole("button", { name: "编辑", exact: true }).click()
    const shortcuts = page.locator(
      '[data-page-slot-active="true"] [data-widget-id="page_moment_w3"]',
    )
    await shortcuts.click()
    await expect(
      page.getByRole("button", { name: "新建文件夹", exact: true }),
    ).toBeVisible()
    await capture(page, "1280x800-moment-shortcut-editor.png", testInfo)

    await page.getByRole("button", { name: "完成", exact: true }).click()
    await page.emulateMedia({ reducedMotion: "reduce" })
    await expect(
      page.locator(
        '[data-page-slot-active="true"] [data-wallpaper-active="true"]',
      ),
    ).toHaveAttribute("data-wallpaper-reduced-motion", "true")
    await capture(page, "1280x800-moment-reduced-motion.png", testInfo)
  } finally {
    await page.close()
  }
})
