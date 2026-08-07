import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../default/createDefaultHome"
import { EXTENSION_VERSION } from "../extensionVersion"
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
  expect(markup).toContain('aria-modal="true"')
  expect(markup).toContain('data-settings-initial-focus="true"')
})

test("Given open Settings About, When the panel renders, Then it shows EXTENSION_VERSION from package.json", () => {
  // Given: single UI source must track package.json, not a duplicated literal
  const packageVersion = (
    JSON.parse(
      readFileSync(resolve(import.meta.dir, "../../package.json"), "utf8"),
    ) as { readonly version: string }
  ).version
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
  expect(packageVersion.length).toBeGreaterThan(0)
  expect(EXTENSION_VERSION).toBe(packageVersion)
  expect(markup).toContain(`yindex v${EXTENSION_VERSION}`)
})
