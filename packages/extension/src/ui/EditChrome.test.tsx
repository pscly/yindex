import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../default/createDefaultHome"
import { EditChrome } from "./EditChrome"

describe("EditChrome modular sidebar", () => {
  test("renders Page Style sections together with Page Sequence and Widget tools", () => {
    // Given
    const doc = createDefaultHome()
    const pageId = doc.sequence.pageIds[0]
    if (pageId === undefined)
      throw new Error("default Home must contain a Page")

    // When
    const html = renderToStaticMarkup(
      <EditChrome
        doc={doc}
        pageId={pageId}
        selectedWidgetId={null}
        onDoc={() => {}}
        onClose={() => {}}
      />,
    )

    // Then
    expect(html).toContain("风格包")
    expect(html).toContain("玻璃档位")
    expect(html).toContain("壁纸压暗")
    expect(html).toContain("页序列")
    expect(html).toContain("添加小组件")
  })

  test("keeps inactive editor controls on the shared graphite boundary", () => {
    // Given
    const doc = createDefaultHome()
    const pageId = doc.sequence.pageIds[0]
    if (pageId === undefined)
      throw new Error("default Home must contain a Page")

    // When
    const html = renderToStaticMarkup(
      <EditChrome
        doc={doc}
        pageId={pageId}
        selectedWidgetId={null}
        onDoc={() => {}}
        onClose={() => {}}
      />,
    )

    // Then
    expect(html).not.toContain(
      "border-color:color-mix(in oklch, white 12%, transparent)",
    )
  })
})
