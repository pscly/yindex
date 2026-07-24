import { describe, expect, test } from "bun:test"
import { resolveSearchUrl } from "./SearchWidget"

describe("search url", () => {
  test("google", () => {
    expect(resolveSearchUrl({ engine: "google" }, "hello world")).toBe(
      "https://www.google.com/search?q=hello%20world",
    )
  })

  test("baidu", () => {
    expect(resolveSearchUrl({ engine: "baidu" }, "易经")).toBe(
      "https://www.baidu.com/s?wd=%E6%98%93%E7%BB%8F",
    )
  })

  test("bing", () => {
    expect(resolveSearchUrl({ engine: "bing" }, "a b")).toBe(
      "https://www.bing.com/search?q=a%20b",
    )
  })

  test("duckduckgo", () => {
    expect(resolveSearchUrl({ engine: "duckduckgo" }, "x")).toBe(
      "https://duckduckgo.com/?q=x",
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

  test("custom without %s appends", () => {
    expect(
      resolveSearchUrl(
        { engine: "custom", customUrl: "https://example.com/?q=" },
        "z",
      ),
    ).toBe("https://example.com/?q=z")
  })
})
