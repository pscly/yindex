import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../default/createDefaultHome"
import { PageDots } from "./PageDots"

test("Given small Page Dot visuals, When rendered, Then every button keeps a 44 CSS-px hit area", () => {
  const doc = createDefaultHome()

  const markup = renderToStaticMarkup(
    <PageDots doc={doc} currentIndex={0} onSelect={() => {}} />,
  )

  expect(markup.match(/min-width:44px/g)?.length).toBe(
    doc.sequence.pageIds.length,
  )
  expect(markup.match(/min-height:44px/g)?.length).toBe(
    doc.sequence.pageIds.length,
  )
  expect(markup).toContain('data-page-dot-visual="true"')
  expect(markup).toContain("width:9px;height:9px")
  expect(markup).toContain("width:7px;height:7px")
})
