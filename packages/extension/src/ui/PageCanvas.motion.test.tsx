import { describe, expect, test } from "bun:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../default/createDefaultHome"
import { PageCanvas } from "./PageCanvas"

const noWidget = (): void => {}

function renderMotionPage(input: {
  readonly ambientMotionAllowed: boolean
  readonly pageActive: boolean
}): string {
  const original = createDefaultHome()
  const doc = {
    ...original,
    settings: {
      ...original.settings,
      motionProfile: "immersive" as const,
      reducedMotion: "never" as const,
    },
  }
  const pageId = doc.sequence.pageIds[0]
  const page = pageId === undefined ? undefined : doc.pages[pageId]
  if (page === undefined) throw new Error("default Home must contain a Page")

  return renderToStaticMarkup(
    createElement(PageCanvas, {
      doc,
      page,
      editMode: false,
      wallpaperActive: input.pageActive,
      motionProfile: "immersive",
      ambientMotionAllowed: input.ambientMotionAllowed,
      selectedWidgetId: null,
      onSelectWidget: noWidget,
      onWidgetConfig: noWidget,
    }),
  )
}

describe("PageCanvas ambient motion host", () => {
  test("Given immersive motion on an active Page, When OS allows motion, Then host drift runs at the profile period", () => {
    const markup = renderMotionPage({
      ambientMotionAllowed: true,
      pageActive: true,
    })

    expect(markup).toContain('data-ambient-motion="running"')
    expect(markup).toContain("--yindex-highlight-drift-sec:24s")
    expect(markup).toContain('data-wallpaper-reduced-motion="false"')
  })

  test("Given stored never and OS reduce, When the active Page renders, Then drift and Wallpaper motion stop", () => {
    const markup = renderMotionPage({
      ambientMotionAllowed: false,
      pageActive: true,
    })

    expect(markup).not.toContain("data-ambient-motion=")
    expect(markup).not.toContain("--yindex-highlight-drift-sec")
    expect(markup).toContain('data-wallpaper-reduced-motion="true"')
  })

  test("Given an inactive Loop Page, When it renders, Then neither highlight nor Wallpaper motion runs", () => {
    const markup = renderMotionPage({
      ambientMotionAllowed: false,
      pageActive: false,
    })

    expect(markup).not.toContain("data-ambient-motion=")
    expect(markup).not.toContain("--yindex-highlight-drift-sec")
    expect(markup).toContain('data-wallpaper-reduced-motion="true"')
  })
})
