import { expect, test } from "bun:test"
import type { HomeDocument } from "@yindex/domain"
import { Children, type ReactNode, isValidElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../../default/createDefaultHome"
import { AdvancedGlassSection } from "./AdvancedGlassSection"

type RangeInputProps = {
  readonly "aria-label"?: string
  readonly onChange?: (event: {
    readonly target: { readonly valueAsNumber: number }
  }) => void
}

function firstPageFixture(): {
  readonly doc: HomeDocument
  readonly pageId: HomeDocument["sequence"]["pageIds"][number]
} {
  const doc = createDefaultHome()
  const pageId = doc.sequence.pageIds[0]
  if (pageId === undefined) throw new Error("default Home must contain a Page")
  return { doc, pageId }
}

function findRangeInput(node: ReactNode, ariaLabel: string): ReactNode {
  if (
    isValidElement<RangeInputProps>(node) &&
    node.type === "input" &&
    node.props["aria-label"] === ariaLabel
  ) {
    return node
  }
  if (!isValidElement<{ readonly children?: ReactNode }>(node)) return null
  for (const child of Children.toArray(node.props.children)) {
    const found = findRangeInput(child, ariaLabel)
    if (found !== null) return found
  }
  return null
}

test("Given a current Page, When advanced glass Settings render, Then the section is collapsed by default", () => {
  // Given
  const { doc, pageId } = firstPageFixture()

  // When
  const markup = renderToStaticMarkup(
    <AdvancedGlassSection doc={doc} pageId={pageId} onDoc={() => undefined} />,
  )

  // Then
  expect(markup).toContain("高级玻璃微调")
  expect(markup).toContain("<details")
  expect(markup).not.toMatch(/<details[^>]*\sopen(?:=|>)/)
})

test("Given the blur control, When its value changes, Then the updated Home is published", () => {
  // Given
  const { doc, pageId } = firstPageFixture()
  const emitted: HomeDocument[] = []
  const section = AdvancedGlassSection({
    doc,
    pageId,
    onDoc: (nextDoc) => emitted.push(nextDoc),
  })
  const blurInput = findRangeInput(section, "模糊")
  if (
    !isValidElement<RangeInputProps>(blurInput) ||
    !blurInput.props.onChange
  ) {
    throw new Error("expected blur range input")
  }

  // When
  blurInput.props.onChange({ target: { valueAsNumber: 7 } })

  // Then
  expect(emitted).toHaveLength(1)
  expect(emitted[0]?.pages[pageId]?.style.glassTuning.blur).toBe(7)
  expect(doc.pages[pageId]?.style.glassTuning.blur).toBe(0)
})
