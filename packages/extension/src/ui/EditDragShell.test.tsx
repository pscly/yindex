import { expect, test } from "bun:test"
import { widgetInstanceId } from "@yindex/domain"
import { renderToStaticMarkup } from "react-dom/server"
import { EditDragShell, keyboardLayoutRect } from "./EditDragShell"

test("Given a selected Widget, When its edit shell renders, Then keyboard movement and resize alternatives are exposed", () => {
  const markup = renderToStaticMarkup(
    <EditDragShell
      widgetId={widgetInstanceId("widget_a11y")}
      x={10}
      y={20}
      w={30}
      h={40}
      selected
      onSelect={() => {}}
      onDraft={() => {}}
    >
      <span>Widget</span>
    </EditDragShell>,
  )

  expect(markup).toContain('data-edit-drag-shell="true"')
  expect(markup).toContain('tabindex="0"')
  expect(markup).toContain('aria-label="编辑小组件布局"')
  expect(markup).toContain('aria-label="缩小小组件"')
  expect(markup).toContain('aria-label="增大小组件"')
})

test("Given a Widget rect, When keyboard commands are applied, Then arrows nudge and size commands resize by the requested step", () => {
  const rect = { x: 10, y: 20, w: 30, h: 40 }

  expect(keyboardLayoutRect(rect, "right")).toEqual({
    x: 11,
    y: 20,
    w: 30,
    h: 40,
  })
  expect(keyboardLayoutRect(rect, "up", true)).toEqual({
    x: 10,
    y: 15,
    w: 30,
    h: 40,
  })
  expect(keyboardLayoutRect(rect, "grow")).toEqual({
    x: 10,
    y: 20,
    w: 31,
    h: 41,
  })
  expect(keyboardLayoutRect(rect, "shrink", true)).toEqual({
    x: 10,
    y: 20,
    w: 25,
    h: 35,
  })
})
