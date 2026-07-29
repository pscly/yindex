import { type Result, err, ok } from "@yindex/domain"

export type UnsafePackageMemberPathError = {
  readonly kind: "unsafe_package_member_path"
  readonly reason:
    | "empty"
    | "absolute"
    | "backslash"
    | "dot_segment"
    | "windows_path"
    | "invalid_characters"
}

const SAFE_PACKAGE_MEMBER_PATH = /^[A-Za-z0-9._/-]+$/

export function parseSafePackageMemberPath(
  raw: string,
): Result<string, UnsafePackageMemberPathError> {
  const candidate = raw.endsWith("/") ? raw.slice(0, -1) : raw
  if (candidate.length === 0) {
    return err({ kind: "unsafe_package_member_path", reason: "empty" })
  }
  if (/^[A-Za-z]:[\\/]/.test(candidate) || candidate.startsWith("//")) {
    return err({ kind: "unsafe_package_member_path", reason: "windows_path" })
  }
  if (candidate.startsWith("/") || candidate.startsWith("\\")) {
    return err({ kind: "unsafe_package_member_path", reason: "absolute" })
  }
  if (candidate.includes("\\")) {
    return err({ kind: "unsafe_package_member_path", reason: "backslash" })
  }

  const segments = candidate.split("/")
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    return err({ kind: "unsafe_package_member_path", reason: "dot_segment" })
  }

  if (!SAFE_PACKAGE_MEMBER_PATH.test(candidate)) {
    return err({
      kind: "unsafe_package_member_path",
      reason: "invalid_characters",
    })
  }

  return ok(candidate)
}
