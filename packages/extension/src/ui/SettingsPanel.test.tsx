import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../default/createDefaultHome"
import { SettingsPanel } from "./SettingsPanel"

test("Given open Settings, When the modal renders, Then its sheet exposes the responsive height hook", () => {
  // Given
  const doc = createDefaultHome()

  // When
  const markup = renderToStaticMarkup(
    <SettingsPanel
      open
      doc={doc}
      pageId={doc.sequence.pageIds[0] ?? null}
      onClose={() => {}}
      onDoc={() => {}}
      onReplaceDoc={() => {}}
    />,
  )

  // Then
  expect(markup).toContain("data-settings-sheet=")
})
