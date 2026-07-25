import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const styles = readFileSync(resolve(import.meta.dir, "styles.css"), "utf8")

test("Given reduced-motion CSS, When global rules are inspected, Then Page Turn transitions are not blanket-nuked", () => {
  expect(styles).not.toContain("transition-duration: 0.01ms !important")
  expect(styles).not.toMatch(
    /\*\s*,\s*\*::before\s*,\s*\*::after\s*\{[^}]*animation-duration/s,
  )
})

test("Given host-controlled lens drift, When CSS is inspected, Then only explicitly running Pages animate highlights", () => {
  expect(styles).toContain(
    '[data-ambient-motion="running"] [data-widget-surface="lens"]::before',
  )
  expect(styles).toContain("var(--yindex-highlight-drift-sec)")
})
