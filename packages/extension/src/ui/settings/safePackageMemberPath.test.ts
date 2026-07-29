import { describe, expect, test } from "bun:test"
import { parseSafePackageMemberPath } from "./safePackageMemberPath"

describe("parseSafePackageMemberPath reasons", () => {
  test("accepts valid nested relative package assets", () => {
    // Given / When
    const nested = parseSafePackageMemberPath("assets/icons/pixel.png")
    const entry = parseSafePackageMemberPath("index.html")

    // Then
    expect(nested).toEqual({ ok: true, value: "assets/icons/pixel.png" })
    expect(entry).toEqual({ ok: true, value: "index.html" })
  })

  test("rejects traversal with dot_segment reason", () => {
    expect(parseSafePackageMemberPath("../escape.html")).toEqual({
      ok: false,
      error: { kind: "unsafe_package_member_path", reason: "dot_segment" },
    })
    expect(parseSafePackageMemberPath("nested/../../outside.js")).toEqual({
      ok: false,
      error: { kind: "unsafe_package_member_path", reason: "dot_segment" },
    })
    expect(parseSafePackageMemberPath("foo/./bar.js")).toEqual({
      ok: false,
      error: { kind: "unsafe_package_member_path", reason: "dot_segment" },
    })
  })

  test("rejects absolute POSIX paths with absolute reason", () => {
    expect(parseSafePackageMemberPath("/abs/path.js")).toEqual({
      ok: false,
      error: { kind: "unsafe_package_member_path", reason: "absolute" },
    })
  })

  test("rejects Windows drive and UNC paths", () => {
    expect(parseSafePackageMemberPath("C:/Windows/system32")).toEqual({
      ok: false,
      error: { kind: "unsafe_package_member_path", reason: "windows_path" },
    })
    expect(parseSafePackageMemberPath("//server/share/file.js")).toEqual({
      ok: false,
      error: { kind: "unsafe_package_member_path", reason: "windows_path" },
    })
  })

  test("rejects backslash separators without normalizing them in", () => {
    expect(parseSafePackageMemberPath("dir\\file.js")).toEqual({
      ok: false,
      error: { kind: "unsafe_package_member_path", reason: "backslash" },
    })
  })

  test("rejects empty and double-slash segments", () => {
    expect(parseSafePackageMemberPath("")).toEqual({
      ok: false,
      error: { kind: "unsafe_package_member_path", reason: "empty" },
    })
    expect(parseSafePackageMemberPath("a//b.js")).toEqual({
      ok: false,
      error: { kind: "unsafe_package_member_path", reason: "dot_segment" },
    })
  })
})
