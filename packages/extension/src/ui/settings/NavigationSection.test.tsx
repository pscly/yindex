import { expect, test } from "bun:test"
import type { HomeDocument } from "@yindex/domain"
import { Children, type ReactNode, isValidElement } from "react"
import { createDefaultHome } from "../../default/createDefaultHome"
import { NavigationSection } from "./NavigationSection"

type SelectProps = {
  readonly "aria-label"?: string
  readonly onChange?: (event: {
    readonly target: { readonly value: string }
  }) => void
}

function findMotionProfileSelect(node: ReactNode): ReactNode {
  if (
    isValidElement<SelectProps>(node) &&
    node.type === "select" &&
    node.props["aria-label"] === "动态档位"
  ) {
    return node
  }
  if (!isValidElement<{ readonly children?: ReactNode }>(node)) return null
  for (const child of Children.toArray(node.props.children)) {
    const found = findMotionProfileSelect(child)
    if (found !== null) return found
  }
  return null
}

test("Given Settings navigation, When immersive motion is selected, Then the persisted Home setting changes", () => {
  const doc = createDefaultHome()
  const emitted: HomeDocument[] = []
  const section = NavigationSection({
    doc,
    onDoc: (nextDoc) => emitted.push(nextDoc),
  })
  const select = findMotionProfileSelect(section)
  if (!isValidElement<SelectProps>(select) || !select.props.onChange) {
    throw new Error("expected motion profile selector")
  }

  select.props.onChange({ target: { value: "immersive" } })

  expect(emitted).toHaveLength(1)
  expect(emitted[0]?.settings.motionProfile).toBe("immersive")
  expect(doc.settings.motionProfile).toBe("balanced")
})
