import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../default/createDefaultHome"
import { PageCanvas } from "./PageCanvas"

test("Given a selected Widget in Edit Mode, When the Page renders, Then layout controls and delete expose keyboard-safe targets", () => {
  const doc = createDefaultHome()
  const pageId = doc.sequence.pageIds[0]
  const page = pageId === undefined ? undefined : doc.pages[pageId]
  const widgetId = page?.widgets[0]?.id
  if (page === undefined || widgetId === undefined) {
    throw new Error("default Home must contain a Widget")
  }

  const markup = renderToStaticMarkup(
    <PageCanvas
      doc={doc}
      page={page}
      editMode
      selectedWidgetId={widgetId}
      onSelectWidget={() => {}}
      onWidgetConfig={() => {}}
      onWidgetLayoutDraft={() => {}}
      onDeleteWidget={() => {}}
    />,
  )

  expect(markup).toContain('aria-label="编辑小组件布局"')
  expect(markup).toContain('aria-label="缩小小组件"')
  expect(markup).toContain('aria-label="增大小组件"')
  expect(markup).toMatch(
    /aria-label="删除小组件"[^>]*style="[^"]*width:44px;height:44px/,
  )
})
