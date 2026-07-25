import { Buffer } from "node:buffer"
import { expect } from "./extension.fixture"
import {
  PACKAGE_ID,
  WALLPAPER_PNG_BASE64,
  activePackageFrame,
  activePackageIframeContext,
  closeSettings,
  installPomodoro,
  openSettings,
  packageWidgetSnapshot,
  test,
  uninstallPomodoro,
  updatePomodoroPermissions,
} from "./extension.package-persistence.helpers"

test("restores the same Widget Instance after Package removal, reinstall, and reload", async ({
  extensionPage: page,
}) => {
  await installPomodoro(page)

  const frame = activePackageFrame(page)
  await expect(frame).toBeVisible()
  await expect(frame).toHaveAttribute("sandbox", /allow-scripts/)
  await expect(frame).not.toHaveAttribute("sandbox", /allow-same-origin/)
  const packageCanReadHost = await frame
    .contentFrame()
    .locator("html")
    .evaluate(() => {
      try {
        return window.parent.document.documentElement !== null
      } catch {
        return false
      }
    })
  expect(packageCanReadHost).toBe(false)

  const widgetSlot = frame.locator("xpath=ancestor::*[@data-widget-id][1]")
  const widgetId = await widgetSlot.getAttribute("data-widget-id")
  if (widgetId === null) throw new Error("Package iframe has no Widget slot")
  const layoutStyle = await widgetSlot.getAttribute("style")
  const persistedWidget = await packageWidgetSnapshot(page)

  await uninstallPomodoro(page)

  const retainedSlot = page.locator(
    `[data-page-slot-active="true"] [data-widget-id="${widgetId}"]`,
  )
  await expect(retainedSlot).toBeVisible()
  await expect(retainedSlot).toContainText(PACKAGE_ID)
  await expect(activePackageFrame(page)).toHaveCount(0)
  await expect(retainedSlot).toHaveAttribute("style", layoutStyle ?? "")
  expect(await packageWidgetSnapshot(page)).toBe(persistedWidget)

  await installPomodoro(page)
  await expect(retainedSlot).not.toContainText(PACKAGE_ID)
  await expect(frame).toBeVisible()
  expect(await packageWidgetSnapshot(page)).toBe(persistedWidget)

  await page.reload()
  await expect(page.getByRole("button", { name: "设置" })).toBeVisible()
  await expect(frame).toBeVisible()
  expect(await packageWidgetSnapshot(page)).toBe(persistedWidget)
})

test("round-trips the Home configuration through exported JSON", async ({
  extensionPage: page,
}) => {
  await installPomodoro(page)

  let dialog = await openSettings(page)
  const downloadPromise = page.waitForEvent("download")
  await dialog.getByRole("button", { name: "导出 JSON" }).click()
  const download = await downloadPromise
  await expect(dialog).toContainText("已导出配置 JSON")
  const exportedPath = await download.path()
  if (exportedPath === null) throw new Error("Exported JSON has no local path")

  page.once("dialog", (confirmation) => confirmation.accept())
  await dialog.getByRole("button", { name: "仅重置主页配置" }).click()
  await expect(dialog).toContainText("已重置主页配置")
  await closeSettings(dialog)
  await expect(activePackageFrame(page)).toHaveCount(0)

  dialog = await openSettings(page)
  page.once("dialog", (confirmation) => confirmation.accept())
  await dialog
    .locator('input[type="file"][accept*="application/json"]')
    .setInputFiles(exportedPath)
  await expect(dialog).toContainText("配置已导入")
  await closeSettings(dialog)
  await expect(activePackageFrame(page)).toBeVisible()
})

test("rejects invalid Home JSON without opening a confirmation or crashing", async ({
  extensionPage: page,
}) => {
  const dialog = await openSettings(page)
  const confirmations: string[] = []
  page.once("dialog", async (confirmation) => {
    confirmations.push(confirmation.message())
    await confirmation.dismiss()
  })

  await dialog
    .locator('input[type="file"][accept*="application/json"]')
    .setInputFiles({
      name: "invalid-home.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"schemaVersion":"bad"}'),
    })

  await expect(dialog).toContainText(/配置无效|导入失败/)
  expect(confirmations).toEqual([])
  await expect(dialog.getByRole("button", { name: "关闭" })).toBeVisible()
  await closeSettings(dialog)
  await expect(page.getByRole("button", { name: "设置" })).toBeVisible()
})

test("rejects a corrupt Package zip without changing the catalog or crashing", async ({
  extensionPage: page,
}) => {
  const dialog = await openSettings(page)
  const packageSection = dialog
    .getByRole("heading", { name: "小组件包" })
    .locator("..")

  await packageSection
    .locator('input[type="file"][accept*="zip"]')
    .setInputFiles({
      name: "corrupt-package.zip",
      mimeType: "application/zip",
      buffer: Buffer.from("this is not a zip archive"),
    })

  await expect(packageSection).toContainText(/导入失败|invalid|无效|格式/i)
  await expect(packageSection).toContainText("尚未安装第三方 Package")
  await expect(packageSection.locator("ul")).toHaveCount(0)
  await expect(packageSection).not.toContainText("已导入")
  await closeSettings(dialog)
  await expect(page.getByRole("button", { name: "设置" })).toBeVisible()
})

test("returns an unauthorized bridge response when storage permission is removed", async ({
  extensionPage: page,
}) => {
  await installPomodoro(page)
  await updatePomodoroPermissions(page, [])
  await page.reload()
  await expect(page.getByRole("button", { name: "设置" })).toBeVisible()

  const frame = await activePackageIframeContext(page)
  const response = await frame.evaluate(
    async () =>
      await new Promise<{
        ok: boolean
        error?: { code: string; message: string }
      }>((resolve) => {
        const id = "task23-storage-denied"
        const onMessage = (event: MessageEvent) => {
          const payload = event.data
          if (payload?.channel !== "yindex-bridge" || payload?.id !== id) return
          window.removeEventListener("message", onMessage)
          resolve(payload)
        }
        window.addEventListener("message", onMessage)
        parent.postMessage(
          {
            channel: "yindex-bridge",
            id,
            method: "storage.get",
            params: { key: "remaining" },
          },
          "*",
        )
        setTimeout(() => {
          window.removeEventListener("message", onMessage)
          resolve({ ok: false, error: { code: "timeout", message: "timeout" } })
        }, 2_000)
      }),
  )

  expect(response.ok).toBe(false)
  expect(response.error?.code).toBe("unauthorized")
  await expect(activePackageFrame(page)).toBeVisible()
  await expect(page.getByRole("button", { name: "设置" })).toBeVisible()
})

test("persists uploaded wallpaper media across reload", async ({
  extensionPage: page,
}) => {
  await page.getByRole("button", { name: "编辑", exact: true }).click()
  await page
    .locator('aside[aria-label="编辑面板"] input[accept="image/*,video/*"]')
    .setInputFiles({
      name: "task23-wallpaper.png",
      mimeType: "image/png",
      buffer: Buffer.from(WALLPAPER_PNG_BASE64, "base64"),
    })

  const wallpaper = page.locator(
    '[data-wallpaper-kind="image"][data-wallpaper-active="true"]',
  )
  await expect(wallpaper).toBeVisible()
  await expect(wallpaper).not.toHaveAttribute("data-wallpaper-fallback", "true")

  await page.reload()
  await expect(page.getByRole("button", { name: "设置" })).toBeVisible()
  await expect(wallpaper).toBeVisible()
  await expect(wallpaper).not.toHaveAttribute("data-wallpaper-fallback", "true")
})
