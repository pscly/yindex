import { expect, test } from "bun:test"
import { Children, type ReactNode, isValidElement } from "react"
import { SelectedWidgetEditor } from "./SelectedWidgetEditor"

type SelectProps = {
  readonly onChange?: (event: {
    readonly target: { readonly value: string }
  }) => void
}

test("Quote source changes preserve the existing configuration", () => {
  // Given
  const config = {
    source: "hitokoto",
    refreshHours: 6,
    attribution: "daily",
  }
  const emitted: unknown[] = []
  const editor = SelectedWidgetEditor({
    sourceKind: "builtin",
    typeId: "builtin.quote",
    config,
    onConfig: (nextConfig) => emitted.push(nextConfig),
  })
  if (!isValidElement<{ readonly children?: ReactNode }>(editor)) {
    throw new Error("expected Quote editor element")
  }
  const select = Children.toArray(editor.props.children).find(
    (child) => isValidElement<SelectProps>(child) && child.type === "select",
  )
  if (!isValidElement<SelectProps>(select) || !select.props.onChange) {
    throw new Error("expected Quote source selector")
  }

  // When
  select.props.onChange({ target: { value: "static" } })

  // Then
  expect(emitted).toEqual([
    { source: "static", refreshHours: 6, attribution: "daily" },
  ])
  expect(emitted[0]).not.toBe(config)
  expect(config).toEqual({
    source: "hitokoto",
    refreshHours: 6,
    attribution: "daily",
  })
})
