import { describe, expect, test } from "bun:test"
import { resolveSearchUrl } from "./SearchWidget"

describe("search url", () => {
  test("google", () => {
    expect(resolveSearchUrl({ engine: "google" }, "hello world")).toBe(
      "https://www.google.com/search?q=hello%20world",
    )
  })

  test("custom template", () => {
    expect(
      resolveSearchUrl(
        { engine: "custom", customUrl: "https://example.com/?q=%s" },
        "a",
      ),
    ).toBe("https://example.com/?q=a")
  })
})
