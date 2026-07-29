import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { commitSearchNavigation, resolveSearchUrl } from "./SearchWidget"

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

  test("rejects imported javascript custom search template PoC", () => {
    // Given: a Home-import style custom engine poisoned with javascript:
    const config = {
      engine: "custom" as const,
      customUrl: "javascript:alert(1)//%s",
    }

    // When
    const resolved = resolveSearchUrl(config, "q")

    // Then: no navigable URL is produced
    expect(resolved).toBeNull()
  })

  test("rejects imported data custom search template PoC", () => {
    expect(
      resolveSearchUrl(
        { engine: "custom", customUrl: "data:text/html,<h1>x" },
        "q",
      ),
    ).toBeNull()
  })

  test("rejects file and blob custom search templates", () => {
    expect(
      resolveSearchUrl(
        { engine: "custom", customUrl: "file:///tmp/search?q=%s" },
        "q",
      ),
    ).toBeNull()
    expect(
      resolveSearchUrl(
        { engine: "custom", customUrl: "blob:https://example.com/%s" },
        "q",
      ),
    ).toBeNull()
  })

  test("preserves valid custom https search templates", () => {
    expect(
      resolveSearchUrl(
        { engine: "custom", customUrl: "https://example.com/search?q=%s" },
        "hello world",
      ),
    ).toBe("https://example.com/search?q=hello%20world")
  })
})

describe("Search mounted navigation sink", () => {
  test("submit path never assigns unsafe schemes to the location sink", () => {
    // Given: a poisoned custom engine and a capture for the final location sink
    const assigned: string[] = []
    const config = {
      engine: "custom" as const,
      customUrl: "javascript:alert(1)//%s",
    }

    // When: the same commit path SearchWidget uses on form submit runs
    const navigated = commitSearchNavigation(config, "q", (url) => {
      assigned.push(String(url))
    })

    // Then: the location sink is never written
    expect(navigated).toBe(false)
    expect(assigned).toEqual([])
  })

  test("submit path assigns only safe http(s) targets through the shared boundary", () => {
    // Given
    const assigned: string[] = []
    const config = {
      engine: "custom" as const,
      customUrl: "https://example.com/search?q=%s",
    }

    // When
    const navigated = commitSearchNavigation(config, "hello world", (url) => {
      assigned.push(String(url))
    })

    // Then
    expect(navigated).toBe(true)
    expect(assigned).toEqual(["https://example.com/search?q=hello%20world"])
  })

  test("SearchWidget source routes the location sink only through commitSearchNavigation", () => {
    // Given / When
    const source = readFileSync(
      join(import.meta.dir, "SearchWidget.tsx"),
      "utf8",
    )

    // Then: no direct location assignment outside the shared safe commit helper
    expect(source).toContain("commitSearchNavigation(")
    expect(source).toMatch(
      /commitSearchNavigation\([\s\S]*props\.config[\s\S]*query/,
    )
    const onSubmitBlock = source.slice(
      source.indexOf("function onSubmit"),
      source.indexOf("return (", source.indexOf("function onSubmit")),
    )
    expect(onSubmitBlock).toContain(
      "commitSearchNavigation(props.config, query)",
    )
    expect(onSubmitBlock).not.toMatch(/window\.location\.href\s*=/)
    expect(onSubmitBlock).not.toContain("resolveSearchUrl(")
    expect(source).toContain("parseSafeNavigationUrl")
  })
})
