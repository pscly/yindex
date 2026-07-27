import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Page, TestInfo } from "@playwright/test"
import { expect } from "./extension.fixture"
import {
  BRIGHT_FIXTURE,
  DARK_FIXTURE,
  EVIDENCE_ROOT,
  captureEvidence,
  closeEdit,
  openEdit,
  selectGlassProfile,
  selectScene,
  uploadWallpaper,
} from "./extension.visual-harness"

const SCENES = [
  { id: "page_moment", name: "此刻", slug: "moment" },
  { id: "page_muse", name: "灵感", slug: "muse" },
  { id: "page_flow", name: "流光", slug: "flow" },
] as const

const PROFILES = [
  { name: "清透", slug: "clear" },
  { name: "均衡", slug: "balanced" },
  { name: "沉静", slug: "deep" },
] as const

const MOTIONS = [
  { media: "no-preference", reduced: false, slug: "nomotion" },
  { media: "reduce", reduced: true, slug: "rm" },
] as const

const FIXTURES = [
  { path: BRIGHT_FIXTURE, slug: "bright" },
  { path: DARK_FIXTURE, slug: "dark" },
] as const

type VisualMatrixCell = {
  readonly scene: string
  readonly profile: string
  readonly reducedMotion: "off" | "on"
  readonly fixture: "bright" | "dark"
  readonly screenshot: string
}

export const MATRIX_CELLS: readonly VisualMatrixCell[] = SCENES.flatMap(
  (scene) =>
    PROFILES.flatMap((profile) =>
      MOTIONS.flatMap((motion) =>
        FIXTURES.map((fixture) => ({
          scene: scene.name,
          profile: profile.name,
          reducedMotion: motion.reduced ? "on" : "off",
          fixture: fixture.slug,
          screenshot: `scene-${scene.slug}-${profile.slug}-${motion.slug}-${fixture.slug}.png`,
        })),
      ),
    ),
)

export async function captureFullMatrix(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  for (const scene of SCENES) {
    await page.emulateMedia({ reducedMotion: "no-preference" })
    const active = await selectScene(page, scene.name, scene.id)
    for (const fixture of FIXTURES) {
      let panel = await openEdit(page)
      await uploadWallpaper(panel, fixture.path)
      for (const [profileIndex, profile] of PROFILES.entries()) {
        await selectGlassProfile(panel, profile.name)
        await closeEdit(panel)
        for (const motion of MOTIONS) {
          await page.emulateMedia({ reducedMotion: motion.media })
          await expect(
            active.locator('[data-wallpaper-active="true"]'),
          ).toHaveAttribute(
            "data-wallpaper-reduced-motion",
            motion.reduced ? "true" : "false",
          )
          await captureEvidence(
            page,
            `scene-${scene.slug}-${profile.slug}-${motion.slug}-${fixture.slug}.png`,
            testInfo,
          )
        }
        if (profileIndex < PROFILES.length - 1) panel = await openEdit(page)
      }
    }
  }
}

export async function writeVisualMatrixEvidence(): Promise<void> {
  const rows = MATRIX_CELLS.map(
    (cell, index) =>
      `| ${index + 1} | ${cell.scene} | ${cell.profile} | ${cell.reducedMotion} | ${cell.fixture} | \`screenshots/${cell.screenshot}\` |`,
  )
  const markdown = [
    "# Task 25 — Visual / contrast / a11y evidence matrix",
    "",
    "Generated: 2026-07-26  ",
    "Suite: `tests/e2e/extension.visual-contrast.spec.ts`  ",
    "Conformance: WCAG 2.x relative luminance (not Lighthouse; not v1 comps)",
    "",
    "## Full scene × Glass Profile × reduced-motion × fixture cross",
    "",
    `Coverage: 3 scenes × 3 Glass Profiles × 2 reduced-motion states × 2 wallpaper fixtures = **${MATRIX_CELLS.length} cells**.`,
    "",
    "| # | Scene | Glass Profile | Reduced motion | Fixture | Screenshot |",
    "|---:|-------|---------------|----------------|---------|------------|",
    ...rows,
    "",
    "## Default-state and keyboard-focus captures",
    "",
    "| Scene | Browse Mode | Keyboard `:focus-visible` |",
    "|-------|-------------|---------------------------|",
    "| 此刻 | `screenshots/scene-default-moment.png` | `screenshots/focus-default-moment.png` |",
    "| 灵感 | `screenshots/scene-default-muse.png` | `screenshots/focus-default-muse.png` |",
    "| 流光 | `screenshots/scene-default-flow.png` | `screenshots/focus-default-flow.png` |",
    "",
    "Additional focus states: `screenshots/focus-settings.png`, `screenshots/focus-edit-widget-selected.png`.",
    "",
    "## Reduced-motion Page Turn frames",
    "",
    "| Frame | Screenshot | Mapping |",
    "|-------|------------|---------|",
    "| before | `screenshots/page-turn-rm-before-moment.png` | 此刻 settled |",
    "| mid | `screenshots/page-turn-rm-mid-moment-to-muse.png` | controlled clock +60 ms, outgoing/incoming crossfade |",
    "| after | `screenshots/page-turn-rm-after-muse.png` | 灵感 settled after 140 ms |",
    "",
    "## Contrast samples",
    "",
    "`contrast-samples.json` contains four composited samples. Text floor: 4.5; non-text floor: 3.0. The suite fails if any sample misses its floor.",
    "",
    "## axe reports",
    "",
    "- `axe-default-moment.json`",
    "- `axe-default-muse.json`",
    "- `axe-default-flow.json`",
    "",
    "Every report is gated at critical/serious = 0.",
    "",
    "## Intentional ARIA snapshots",
    "",
    "- `tests/e2e/extension.visual-contrast.spec.ts-snapshots/active-moment.aria.yml`",
    "- `tests/e2e/extension.visual-contrast.spec.ts-snapshots/edit-glass-section.aria.yml`",
    "- Settings dialog: inline partial ARIA snapshot in `tests/e2e/extension.visual-contrast.spec.ts` (stable roles and names; volatile storage quota copy excluded)",
  ].join("\n")
  await writeFile(resolve(EVIDENCE_ROOT, "matrix.md"), `${markdown}\n`)
}
