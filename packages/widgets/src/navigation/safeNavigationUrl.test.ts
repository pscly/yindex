import { describe, expect, test } from "bun:test"
import { parseSafeNavigationUrl } from "./safeNavigationUrl"

describe("parseSafeNavigationUrl", () => {
  test("allows https navigation targets", () => {
    // Given
    const raw = "https://example.com/search?q=hello"

    // When
    const result = parseSafeNavigationUrl(raw)

    // Then
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(String(result.value)).toBe("https://example.com/search?q=hello")
    }
  })

  test("allows http navigation targets", () => {
    // Given / When
    const result = parseSafeNavigationUrl("http://example.com/")

    // Then
    expect(result.ok).toBe(true)
    if (result.ok) expect(String(result.value)).toBe("http://example.com/")
  })

  test("rejects javascript scheme PoC", () => {
    // Given / When
    const result = parseSafeNavigationUrl("javascript:alert(1)//q")

    // Then
    expect(result).toEqual({
      ok: false,
      error: { kind: "unsafe_navigation_url", reason: "disallowed_scheme" },
    })
  })

  test("rejects data scheme PoC", () => {
    // Given / When
    const result = parseSafeNavigationUrl("data:text/html,<h1>x")

    // Then
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe("disallowed_scheme")
  })

  test("rejects file scheme PoC", () => {
    // Given / When
    const result = parseSafeNavigationUrl("file:///etc/passwd")

    // Then
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe("disallowed_scheme")
  })

  test("rejects blob scheme PoC", () => {
    // Given / When
    const result = parseSafeNavigationUrl("blob:https://example.com/uuid")

    // Then
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe("disallowed_scheme")
  })

  test("rejects empty and non-absolute targets", () => {
    expect(parseSafeNavigationUrl("").ok).toBe(false)
    expect(parseSafeNavigationUrl("   ").ok).toBe(false)
    expect(parseSafeNavigationUrl("not a url").ok).toBe(false)
    expect(parseSafeNavigationUrl("//evil.example/%s").ok).toBe(false)
  })

  test("rejects https username-only credentials", () => {
    // Given: a host-shaped URL that differs from ordinary path data by embedding userinfo
    const raw = "https://navigator-user@evil.example/search"

    // When
    const result = parseSafeNavigationUrl(raw)

    // Then
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe("credentials")
  })

  test("rejects http password-bearing credentials", () => {
    // Given
    const raw = "http://navigator-user:s3cret-token@example.com/path"

    // When
    const result = parseSafeNavigationUrl(raw)

    // Then
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe("credentials")
  })

  test("returns canonical serialized URL rather than trimmed spelling", () => {
    // Given: spelling whose URL.href differs from the trimmed input
    const raw = "  HTTPS://Example.COM:443/./a/../b?q=1  "
    const canonical = new URL(raw.trim()).href
    expect(canonical).not.toBe(raw.trim())

    // When
    const result = parseSafeNavigationUrl(raw)

    // Then
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(String(result.value)).toBe(canonical)
      expect(String(result.value)).not.toBe(raw.trim())
    }
  })
})
