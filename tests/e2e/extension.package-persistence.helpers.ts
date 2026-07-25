import type { Locator, Page } from "@playwright/test"
import { expect, test as extensionTest } from "./extension.fixture"

export const PACKAGE_FRAME_TITLE = "com.example.pomodoro/pomodoro.timer"
export const PACKAGE_ID = "com.example.pomodoro"
export const WALLPAPER_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn7l4sAAAAASUVORK5CYII="

const CLEAR_EXTENSION_STATE = `(async () => {
  await chrome.storage.local.clear()
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase("yindex-packages")
    req.onsuccess = () => resolve(null)
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve(null)
  })
  const root = await navigator.storage?.getDirectory?.()
  await root?.removeEntry("yindex-wallpaper-media", { recursive: true }).catch(() => null)
})()`

export const test = extensionTest.extend<{ readonly extensionPage: Page }>({
  extensionPage: async ({ extensionContext, extensionId }, use) => {
    const extensionWorker =
      extensionContext.serviceWorkers()[0] ??
      (await extensionContext.waitForEvent("serviceworker"))
    await extensionWorker.evaluate(CLEAR_EXTENSION_STATE)

    const page = await extensionContext.newPage()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`chrome-extension://${extensionId}/newtab.html`)
    await expect(page.getByRole("button", { name: "设置" })).toBeVisible({
      timeout: 15_000,
    })

    try {
      await use(page)
    } finally {
      if (!page.isClosed()) {
        await page.evaluate(CLEAR_EXTENSION_STATE)
        await page.close()
      }
      await extensionWorker.evaluate(CLEAR_EXTENSION_STATE)
    }
  },
})

test.setTimeout(90_000)

export async function openSettings(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "设置" }).click()
  const dialog = page.getByRole("dialog", { name: "设置" })
  await expect(dialog).toBeVisible()
  return dialog
}

export async function closeSettings(dialog: Locator): Promise<void> {
  await dialog.getByRole("button", { name: "关闭" }).click()
  await expect(dialog).toBeHidden()
}

export function activePackageFrame(page: Page): Locator {
  return page.locator(
    `[data-page-slot-active="true"] iframe[title="${PACKAGE_FRAME_TITLE}"]`,
  )
}

export async function activePackageIframeContext(page: Page) {
  const handle = await activePackageFrame(page).elementHandle()
  if (handle === null) throw new Error("Package iframe handle is missing")
  const frame = await handle.contentFrame()
  if (frame === null) throw new Error("Package iframe context is missing")
  return frame
}

export async function installPomodoro(page: Page): Promise<void> {
  const dialog = await openSettings(page)
  await dialog.getByRole("button", { name: "安装示例番茄钟" }).click()
  await expect(dialog).toContainText("已安装示例：番茄钟")
  await closeSettings(dialog)
  await expect(activePackageFrame(page)).toBeVisible()
}

export async function uninstallPomodoro(page: Page): Promise<void> {
  const dialog = await openSettings(page)
  const packageRow = dialog.locator("li").filter({ hasText: "番茄钟" })
  await packageRow.getByRole("button", { name: "卸载" }).click()
  await expect(dialog).toContainText("已卸载 番茄钟")
  await closeSettings(dialog)
}

export async function packageWidgetSnapshot(page: Page): Promise<string> {
  return page.evaluate<string>(`(async () => {
    const stored = await chrome.storage.local.get("yindex.home")
    const home = stored["yindex.home"]
    const widget = Object.values(home.pages)
      .flatMap((candidate) => candidate.widgets)
      .find((candidate) => candidate.source.packageId === "${PACKAGE_ID}")
    if (!widget) throw new Error("Pomodoro Widget Instance was not persisted")
    return JSON.stringify({ id: widget.id, layout: widget.layout, config: widget.config })
  })()`)
}

export async function updatePomodoroPermissions(
  page: Page,
  permissions: readonly string[],
): Promise<void> {
  const worker =
    page.context().serviceWorkers()[0] ??
    (await page.context().waitForEvent("serviceworker"))
  await worker.evaluate(
    async ({ nextPermissions, packageId }) => {
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("yindex-packages", 1)
        open.onerror = () => reject(open.error ?? new Error("idb open failed"))
        open.onsuccess = () => {
          const database = open.result
          if (!database.objectStoreNames.contains("packages")) {
            database.close()
            reject(new Error("packages store missing"))
            return
          }
          const tx = database.transaction("packages", "readwrite")
          const store = tx.objectStore("packages")
          const request = store.get(packageId)
          request.onerror = () =>
            reject(request.error ?? new Error("idb get failed"))
          request.onsuccess = () => {
            const row = request.result
            if (!row) {
              database.close()
              reject(new Error("pomodoro package missing"))
              return
            }
            row.manifest.permissions = [...nextPermissions]
            store.put(row)
          }
          tx.oncomplete = () => {
            database.close()
            resolve()
          }
          tx.onerror = tx.onabort = () => {
            database.close()
            reject(tx.error ?? new Error("idb transaction failed"))
          }
        }
      })
    },
    { nextPermissions: permissions, packageId: PACKAGE_ID },
  )
}
