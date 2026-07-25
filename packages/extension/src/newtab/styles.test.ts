import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const stylesPath = resolve(import.meta.dir, "styles.css")

describe("new-tab reduced-motion stylesheet", () => {
  test("Given the reduced-motion media query, When CSS is inspected, Then it has no blanket transition nuke", () => {
    // Given / When
    const css = readFileSync(stylesPath, "utf8")

    // Then
    expect(css).not.toContain("transition-duration: 0.01ms !important")
    expect(css).not.toMatch(
      /\*,\s*\*::before,\s*\*::after\s*\{[^}]*animation-duration/s,
    )
  })

  test("Given required reduced-motion chrome, When CSS is inspected, Then the 120ms fade and press policy remain available", () => {
    // Given / When
    const css = readFileSync(stylesPath, "utf8")

    // Then
    expect(css).toContain("@keyframes yindex-chrome-panel-fade")
    expect(css).toContain("--chrome-press-ms, 120ms")
  })
})
