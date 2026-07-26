import { writeFile } from "node:fs/promises"
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
  captureEvidence,
  closeEdit,
  openEdit,
  openVisualHome,
  selectGlassProfile,
  selectScene,
  uploadWallpaper,
} from "./extension.visual-harness"

test.describe.configure({ mode: "serial" })
test.setTimeout(180_000)

const SCENES = [
  { id: "page_moment", name: "此刻", slug: "moment" },
  { id: "page_muse", name: "灵感", slug: "muse" },
  { id: "page_flow", name: "流光", slug: "flow" },
] as const

async function saveAxeEvidence(page: Page, name: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze()
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

test("captures the required scene, profile, motion, wallpaper, focus, and ARIA matrix", async ({
  extensionContext,
  extensionId,
}, testInfo) => {
  const page = await openVisualHome(extensionContext, extensionId)
  try {
    for (const scene of SCENES) {
      await selectScene(page, scene.name, scene.id)
      await captureEvidence(page, `scene-default-${scene.slug}.png`, testInfo)
    }

    const moment = await selectScene(page, "此刻", "page_moment")
    await expect(
      page.locator('[data-page-slot-active="true"]'),
    ).toMatchAriaSnapshot({ name: "active-moment.aria.yml" })
    const profilePanel = await openEdit(page)
    for (const profile of [
      { name: "清透", slug: "clear" },
      { name: "沉静", slug: "deep" },
      { name: "均衡", slug: "balanced" },
    ] as const) {
      await selectGlassProfile(profilePanel, profile.name)
      await captureEvidence(
        page,
        `profile-${profile.slug}-moment.png`,
        testInfo,
      )
    }
    await expect(
      profilePanel.locator('section[aria-labelledby="edit-glass-heading"]'),
    ).toMatchAriaSnapshot({ name: "edit-glass-section.aria.yml" })
    await closeEdit(profilePanel)

    await page.emulateMedia({ reducedMotion: "reduce" })
    for (const scene of SCENES) {
      const active = await selectScene(page, scene.name, scene.id)
      await expect(
        active.locator('[data-wallpaper-active="true"]'),
      ).toHaveAttribute("data-wallpaper-reduced-motion", "true")
      await captureEvidence(page, `reduced-motion-${scene.slug}.png`, testInfo)
    }
    await page.emulateMedia({ reducedMotion: "no-preference" })

    await selectScene(page, "此刻", "page_moment")
    await page.getByRole("button", { name: "设置" }).click()
    const settings = page.getByRole("dialog", { name: "设置" })
    await expect(settings).toBeVisible()
    await expect(settings).toMatchAriaSnapshot({
      name: "settings-dialog.aria.yml",
    })
    await expect(
      settings.locator('[data-settings-initial-focus="true"]'),
    ).toBeFocused()
    await captureEvidence(page, "focus-settings.png", testInfo)
    await settings.getByRole("button", { name: "关闭" }).click()

    const editPanel = await openEdit(page)
    const weather = moment.locator('[data-widget-id="page_moment_w0"]')
    await weather.click()
    const layoutShell = weather.getByLabel("编辑小组件布局")
    await layoutShell.focus()
    await expect(layoutShell).toBeFocused()
    await captureEvidence(page, "focus-edit-widget-selected.png", testInfo)
    await uploadWallpaper(editPanel, BRIGHT_FIXTURE)
    await closeEdit(editPanel)
    await captureEvidence(page, "fixture-bright-moment.png", testInfo)

    await selectScene(page, "流光", "page_flow")
    const flowPanel = await openEdit(page)
    await selectGlassProfile(flowPanel, "沉静")
    await uploadWallpaper(flowPanel, DARK_FIXTURE)
    await closeEdit(flowPanel)
    await captureEvidence(page, "fixture-dark-flow.png", testInfo)
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
    await saveAxeEvidence(page, "default-moment")

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
    await saveAxeEvidence(page, "dark-deep-flow")

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
