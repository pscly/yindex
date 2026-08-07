/**
 * Capture local preview screenshots of the built Extension into previews/.
 * Usage: bun run preview   (builds dist first, then captures)
 * Re-run any time; files are overwritten in place so you can watch them.
 */
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { chromium } from "@playwright/test"

const root = resolve(__dirname, "..")
const extensionPath = resolve(root, "packages/extension/dist")
const outDir = resolve(root, "previews")
const profile = mkdtempSync(resolve(tmpdir(), "yindex-preview-"))

const context = await chromium.launchPersistentContext(profile, {
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
  channel: "chromium",
  headless: true,
  viewport: { width: 1440, height: 900 },
})

try {
  const sw =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker", { timeout: 10_000 }))
  const id = new URL(sw.url()).host
  const page = await context.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`chrome-extension://${id}/newtab.html`, {
    waitUntil: "networkidle",
  })
  await page.waitForTimeout(3500)

  await page.screenshot({ path: resolve(outDir, "1-moment.png") })

  await page.keyboard.press("PageDown")
  await page.waitForTimeout(1800)
  await page.screenshot({ path: resolve(outDir, "2-muse.png") })

  await page.keyboard.press("PageDown")
  await page.waitForTimeout(1800)
  await page.screenshot({ path: resolve(outDir, "3-flow.png") })

  // Folder overlay state: inject a folder, reopen on MOMENT
  await page.keyboard.press("PageUp")
  await page.keyboard.press("PageUp")
  await page.waitForTimeout(1500)
  await page.evaluate(async () => {
    const chromeApi = globalThis.chrome
    const KEY = "yindex.home"
    const result = await chromeApi.storage.local.get(KEY)
    const home = result[KEY]
    const moment = home.pages.page_moment
    const sc = moment.widgets.find(
      (w) => w.source.typeId === "builtin.shortcuts",
    )
    const items = sc.config.items
    sc.config.items = [
      ...items.slice(0, 3),
      { id: "f1", title: "谷歌套件", items: items.slice(3, 6) },
      ...items.slice(6),
    ]
    await chromeApi.storage.local.set({ [KEY]: home })
  })
  await page.reload({ waitUntil: "networkidle" })
  await page.waitForTimeout(2500)
  await page.getByRole("button", { name: /谷歌套件/ }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: resolve(outDir, "4-folder-open.png") })
  await page.keyboard.press("Escape")
  await page.waitForTimeout(400)

  // Edit mode
  const editBtn = page.getByRole("button", { name: /编辑/ }).first()
  if (await editBtn.count()) {
    await editBtn.click()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: resolve(outDir, "5-edit-mode.png") })
  }

  console.log(`previews written to ${outDir}`)
} finally {
  await context.close()
  rmSync(profile, { recursive: true, force: true })
}
