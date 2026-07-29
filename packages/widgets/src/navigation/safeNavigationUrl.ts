import { type Brand, type Result, brandAs, err, ok } from "@yindex/domain"

export type SafeNavigationUrl = Brand<string, "SafeNavigationUrl">

export type UnsafeNavigationUrlError = {
  readonly kind: "unsafe_navigation_url"
  readonly reason: "empty" | "invalid_url" | "disallowed_scheme" | "credentials"
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"])

export function parseSafeNavigationUrl(
  raw: string,
): Result<SafeNavigationUrl, UnsafeNavigationUrlError> {
  const trimmed = raw.trim()
  if (!trimmed) {
    return err({ kind: "unsafe_navigation_url", reason: "empty" })
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return err({ kind: "unsafe_navigation_url", reason: "invalid_url" })
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return err({ kind: "unsafe_navigation_url", reason: "disallowed_scheme" })
  }

  if (parsed.username !== "" || parsed.password !== "") {
    return err({ kind: "unsafe_navigation_url", reason: "credentials" })
  }

  return ok(brandAs<string, "SafeNavigationUrl">(parsed.href))
}
