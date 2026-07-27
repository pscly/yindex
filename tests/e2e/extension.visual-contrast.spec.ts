import { readdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import AxeBuilder from "@axe-core/playwright"
import type { Locator, Page } from "@playwright/test"
import {
  measureNonTextContrast,
  measureTextContrast,
  writeContrastEvidence,
} from "./extension.contrast-evidence"
import { expect, test } from "./extension.fixture"
import {
  BRIGHT_FIXTURE,
  DARK_FIXTURE,
  EVIDENCE_ROOT,
  SCREENSHOT_ROOT,
  acquireVisualEvidenceLock,
  captureEvidence,
  closeEdit,
  openEdit,
  openVisualHome,
  resetVisualEvidence,
  selectGlassProfile,
  selectScene,
  uploadWallpaper,
} from "./extension.visual-harness"
import {
  MATRIX_CELLS,
  captureFullMatrix,
  writeVisualMatrixEvidence,
} from "./extension.visual-matrix"

test.describe.configure({ mode: "serial" })
test.setTimeout(360_000)

let releaseVisualEvidenceLock: (() => Promise<void>) | undefined

test.beforeAll(async () => {
  releaseVisualEvidenceLock = await acquireVisualEvidenceLock()
})

test.afterAll(async () => {
  await releaseVisualEvidenceLock?.()
  releaseVisualEvidenceLock = undefined
})

const SCENES = [
  { id: "page_moment", name: "此刻", slug: "moment" },
  { id: "page_muse", name: "灵感", slug: "muse" },
  { id: "page_flow", name: "流光", slug: "flow" },
] as const

async function saveAxeEvidence(
  page: Page,
  name: string,
  scope?: string,
): Promise<void> {
  const builder = new AxeBuilder({ page })
  const results = await (scope
    ? builder.include(scope).analyze()
    : builder.analyze())
  await writeFile(
    resolve(EVIDENCE_ROOT, `axe-${name}.json`),
    `${JSON.stringify(results, null, 2)}\n`,
  )
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  )
  expect(blocking, `${name} has critical or serious axe violations`).toEqual([])
}

function activeClock(page: Page): Locator {
  return page.locator('[data-page-slot-active="true"] [aria-label^="当前时间"]')
}

async function exposeKeyboardFocus(page: Page, target: Locator): Promise<void> {
  await target.focus()
  await page.keyboard.press("Tab")
  await page.keyboard.press("Shift+Tab")
  await expect(target).toBeFocused()
  await expect
    .poll(() => target.evaluate((element) => element.matches(":focus-visible")))
    .toBe(true)
  await expect(target).toHaveCSS("outline-style", "solid")
  await expect(target).toHaveCSS("outline-width", "2px")
}

test("captures the required scene, profile, motion, wallpaper, focus, and ARIA matrix", async ({
  extensionContext,
  extensionId,
}, testInfo) => {
  await resetVisualEvidence()
  const darkDeepAxePage = await openVisualHome(extensionContext, extensionId)
  try {
    await selectScene(darkDeepAxePage, "流光", "page_flow")
    const darkDeepAxePanel = await openEdit(darkDeepAxePage)
    await selectGlassProfile(darkDeepAxePanel, "沉静")
    await uploadWallpaper(darkDeepAxePanel, DARK_FIXTURE)
    await closeEdit(darkDeepAxePanel)
    await saveAxeEvidence(
      darkDeepAxePage,
      "dark-deep-flow",
      '[data-page-slot-active="true"]',
    )
  } finally {
    await darkDeepAxePage.close()
  }

  const page = await openVisualHome(extensionContext, extensionId)
  try {
    for (const scene of SCENES) {
      await selectScene(page, scene.name, scene.id)
      await captureEvidence(page, `scene-default-${scene.slug}.png`, testInfo)
      await saveAxeEvidence(page, `default-${scene.slug}`)
      await page.keyboard.press("Tab")
      await expect(page.locator(":focus-visible")).toHaveCount(1)
      await expect(page.locator(":focus-visible")).toBeVisible()
      await captureEvidence(page, `focus-default-${scene.slug}.png`, testInfo)
    }

    const moment = await selectScene(page, "此刻", "page_moment")
    await expect(
      page.locator('[data-page-slot-active="true"]'),
    ).toMatchAriaSnapshot({ name: "active-moment.aria.yml" })
    const profilePanel = await openEdit(page)
    await expect(
      profilePanel.locator('section[aria-labelledby="edit-glass-heading"]'),
    ).toMatchAriaSnapshot({ name: "edit-glass-section.aria.yml" })
    await closeEdit(profilePanel)

    const settingsButton = page.getByRole("button", { name: "设置" })
    await exposeKeyboardFocus(page, settingsButton)
    await page.keyboard.press("Enter")
    const settings = page.getByRole("dialog", { name: "设置" })
    await expect(settings).toBeVisible()
    await expect(settings).toMatchAriaSnapshot(`
      - dialog "设置":
        - heading "设置" [level=2]
        - button "关闭"
        - heading "导航" [level=3]
        - checkbox "记住上次所在页（关闭则始终打开 Landing）"
        - checkbox "允许每日重抽六十四卦"
        - checkbox "编辑时启用吸附" [checked]
        - combobox "减少动态效果"
        - combobox "动态档位"
        - heading "配置导入导出" [level=3]
        - button "导出 JSON"
        - button "导入 JSON"
        - heading "小组件包" [level=3]
        - button "安装示例番茄钟"
        - heading "壁纸资源" [level=3]
        - heading "重置" [level=3]
        - button "仅重置主页配置"
        - button "清除全部本地数据"
        - heading "关于" [level=3]
    `)
    const settingsInitialFocus = settings.locator(
      '[data-settings-initial-focus="true"]',
    )
    await expect(settingsInitialFocus).toBeFocused()
    await expect
      .poll(() =>
        settingsInitialFocus.evaluate((element) =>
          element.matches(":focus-visible"),
        ),
      )
      .toBe(true)
    await captureEvidence(page, "focus-settings.png", testInfo)
    await page.keyboard.press("Escape")
    await expect(settings).toBeHidden()

    const editButton = page.getByRole("button", { name: "编辑", exact: true })
    await exposeKeyboardFocus(page, editButton)
    await page.keyboard.press("Enter")
    const editPanel = page.locator('aside[aria-label="编辑面板"]')
    await expect(editPanel).toBeVisible()
    const weather = moment.locator('[data-widget-id="page_moment_w0"]')
    await weather.click()
    const layoutShell = weather.getByLabel("编辑小组件布局")
    await exposeKeyboardFocus(page, layoutShell)
    await captureEvidence(page, "focus-edit-widget-selected.png", testInfo)
    await closeEdit(editPanel)

    await expect(weather).toContainText("风速 8 km/h")
    const weatherContent = weather.locator("[data-widget-surface] > div")
    const overflow = await weatherContent.evaluate((element) => ({
      clientHeight: element.clientHeight,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      scrollWidth: element.scrollWidth,
    }))
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth)
    expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight)
    await writeFile(
      resolve(EVIDENCE_ROOT, "weather-moment-bounds.json"),
      `${JSON.stringify(
        {
          text: await weather.innerText(),
          ...overflow,
          unclipped:
            overflow.scrollWidth <= overflow.clientWidth &&
            overflow.scrollHeight <= overflow.clientHeight,
        },
        null,
        2,
      )}\n`,
    )

    await captureFullMatrix(page, testInfo)
    expect(MATRIX_CELLS).toHaveLength(36)
    const matrixPattern =
      /^scene-(moment|muse|flow)-(clear|balanced|deep)-(nomotion|rm)-(bright|dark)\.png$/
    const producedMatrix = (await readdir(SCREENSHOT_ROOT))
      .filter((name) => matrixPattern.test(name))
      .sort()
    const expectedMatrix = MATRIX_CELLS.map((cell) => cell.screenshot).sort()
    expect(producedMatrix).toEqual(expectedMatrix)
    await writeVisualMatrixEvidence()
  } finally {
    await page.close()
  }
})

test("captures a deterministic reduced-motion Page Turn before, mid, and after", async ({
  extensionContext,
  extensionId,
}, testInfo) => {
  const page = await openVisualHome(extensionContext, extensionId, {
    controlledClock: true,
  })
  try {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await selectScene(page, "此刻", "page_moment")
    await page.clock.pauseAt(new Date("2026-07-26T08:09:00+08:00"))
    await captureEvidence(page, "page-turn-rm-before-moment.png", testInfo)

    await page.getByRole("button", { name: "灵感", exact: true }).click()
    const outgoing = page.locator('[data-page-turn-role="outgoing"]')
    const incoming = page.locator('[data-page-turn-role="incoming"]')
    await expect(outgoing).toHaveCount(1)
    await expect(incoming).toHaveCount(1)
    await page.clock.runFor(60)
    const midOpacity = await Promise.all([
      outgoing.evaluate((element) => Number(getComputedStyle(element).opacity)),
      incoming.evaluate((element) => Number(getComputedStyle(element).opacity)),
    ])
    expect(midOpacity[0]).toBeGreaterThan(0)
    expect(midOpacity[0]).toBeLessThan(1)
    expect(midOpacity[1]).toBeGreaterThan(0)
    expect(midOpacity[1]).toBeLessThan(1)
    expect(midOpacity[0] + midOpacity[1]).toBeCloseTo(1, 5)
    await captureEvidence(page, "page-turn-rm-mid-moment-to-muse.png", testInfo)

    await page.clock.runFor(80)
    await expect(
      page.getByRole("button", { name: "灵感", exact: true }),
    ).toHaveAttribute("aria-current", "true")
    await expect(outgoing).toHaveCount(0)
    await captureEvidence(page, "page-turn-rm-after-muse.png", testInfo)
  } finally {
    await page.close()
  }
})

test("gates composited contrast and critical accessibility on required fixtures", async ({
  extensionContext,
  extensionId,
}) => {
  const page = await openVisualHome(extensionContext, extensionId)
  try {
    const brightPanel = await openEdit(page)
    await uploadWallpaper(brightPanel, BRIGHT_FIXTURE)
    await closeEdit(brightPanel)
    const samples = [
      await measureTextContrast(page, activeClock(page), {
        id: "bright-moment-clock-text",
        fixture: "bright.png + 此刻",
        profile: "balanced",
        floor: 4.5,
      }),
      await measureNonTextContrast(
        page,
        page.getByRole("button", { name: "编辑", exact: true }),
        {
          id: "bright-moment-edit-chrome",
          fixture: "bright.png + 此刻",
          profile: "balanced",
          floor: 3,
        },
      ),
    ]

    const deepPanel = await openEdit(page)
    await selectGlassProfile(deepPanel, "沉静")
    await uploadWallpaper(deepPanel, DARK_FIXTURE)
    await closeEdit(deepPanel)
    samples.push(
      await measureNonTextContrast(
        page,
        page
          .locator(
            '[data-page-slot-active="true"] [data-widget-surface="lens"]',
          )
          .first(),
        {
          id: "dark-moment-deep-glass-lens",
          fixture: "dark.png + 此刻",
          profile: "deep",
          floor: 3,
        },
      ),
    )

    await selectScene(page, "流光", "page_flow")
    const flowPanel = await openEdit(page)
    await selectGlassProfile(flowPanel, "沉静")
    await uploadWallpaper(flowPanel, DARK_FIXTURE)
    await closeEdit(flowPanel)
    samples.push(
      await measureTextContrast(page, activeClock(page), {
        id: "dark-flow-clock-text",
        fixture: "dark.png + 流光",
        profile: "deep",
        floor: 4.5,
      }),
    )
    await writeContrastEvidence(
      resolve(EVIDENCE_ROOT, "contrast-samples.json"),
      samples,
    )
    expect(samples).toHaveLength(4)
    expect(
      samples.filter((sample) => !sample.pass),
      "Every real composited contrast sample must meet its WCAG floor",
    ).toEqual([])
  } finally {
    await page.close()
  }
})
