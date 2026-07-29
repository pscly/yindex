import { describe, expect, test } from "bun:test"
import { strToU8, zipSync } from "fflate"
import { deletePackage, getPackage } from "../../storage/packageStore"
import { installFromZipBytes, normalizeZipPaths } from "./packageImport"

describe("normalizeZipPaths", () => {
  test("strips shared top folder", () => {
    const r = normalizeZipPaths({
      "pkg/manifest.json": "{}",
      "pkg/timer.html": "<html></html>",
    })
    expect(r["manifest.json"]).toBe("{}")
    expect(r["timer.html"]).toContain("html")
  })

  test("keeps flat paths", () => {
    const r = normalizeZipPaths({ "manifest.json": "{}" })
    expect(r["manifest.json"]).toBe("{}")
  })

  test("preserves PNG bytes as a base64 data URL when installing a ZIP", async () => {
    // Given: a valid package ZIP whose PNG includes invalid UTF-8 marker bytes
    const packageId = "com.example.binary-import"
    const pngBytes = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00, 0xfe,
    ])
    const zipBytes = zipSync({
      "manifest.json": strToU8(
        JSON.stringify({
          packageId,
          name: "Binary import fixture",
          version: "1.0.0",
          engines: { yindex: ">=1 <2" },
          yindexApiVersion: 1,
          types: [
            {
              typeId: "binary.fixture",
              name: "Binary fixture",
              entry: "index.html",
              defaultSize: { w: 12, h: 12 },
            },
          ],
          permissions: [],
          hostPermissions: [],
        }),
      ),
      "index.html": strToU8("<!doctype html><title>fixture</title>"),
      "assets/pixel.png": pngBytes,
    })

    // When: the ZIP crosses the import and package-storage boundary
    const result = await installFromZipBytes(zipBytes)
    const stored = await getPackage(packageId)

    // Then: the binary entry remains byte-identical instead of being UTF-8 decoded
    expect(result.ok).toBe(true)
    const dataUrl = stored?.files["assets/pixel.png"]
    expect(dataUrl).toBe(
      `data:image/png;base64,${Buffer.from(pngBytes).toString("base64")}`,
    )

    await deletePackage(packageId)
  })

  test("rejects ZIP members with parent-directory traversal PoC", async () => {
    // Given: a crafted package ZIP whose member keys use .. segments
    const zipBytes = zipSync({
      "manifest.json": strToU8(
        JSON.stringify({
          packageId: "com.example.traversal",
          name: "Traversal fixture",
          version: "1.0.0",
          engines: { yindex: ">=1 <2" },
          yindexApiVersion: 1,
          types: [
            {
              typeId: "traversal.fixture",
              name: "Traversal fixture",
              entry: "index.html",
              defaultSize: { w: 12, h: 12 },
            },
          ],
          permissions: [],
          hostPermissions: [],
        }),
      ),
      "index.html": strToU8("<!doctype html><title>ok</title>"),
      "../escape.html": strToU8("<!doctype html><title>escape</title>"),
      "nested/../../outside.js": strToU8("export const x = 1"),
    })

    // When
    const result = await installFromZipBytes(zipBytes)

    // Then: hostile archives are rejected before package storage
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain("不安全的包路径")
      expect(result.pathError).toEqual({
        kind: "unsafe_package_member_path",
        reason: "dot_segment",
      })
    }
    expect(await getPackage("com.example.traversal")).toBeUndefined()
  })

  test("rejects absolute, backslash, and empty ZIP member paths", async () => {
    const absoluteZip = zipSync({
      "manifest.json": strToU8("{}"),
      "/abs/path.js": strToU8("export {}"),
    })
    const backslashZip = zipSync({
      "manifest.json": strToU8("{}"),
      "dir\\file.js": strToU8("export {}"),
    })
    const emptyZip = zipSync({
      "manifest.json": strToU8("{}"),
      "": strToU8("export {}"),
    })

    const absolute = await installFromZipBytes(absoluteZip)
    const backslash = await installFromZipBytes(backslashZip)
    const empty = await installFromZipBytes(emptyZip)

    expect(absolute.ok).toBe(false)
    if (!absolute.ok) {
      expect(absolute.pathError?.reason).toBe("absolute")
    }
    expect(backslash.ok).toBe(false)
    if (!backslash.ok) {
      expect(backslash.pathError?.reason).toBe("backslash")
    }
    expect(empty.ok).toBe(false)
    if (!empty.ok) {
      expect(empty.pathError?.reason).toBe("empty")
    }
  })

  test("rejects Windows drive and UNC ZIP member paths with windows_path reason", async () => {
    const driveZip = zipSync({
      "manifest.json": strToU8("{}"),
      "C:/Windows/system32/evil.js": strToU8("export {}"),
    })
    const uncZip = zipSync({
      "manifest.json": strToU8("{}"),
      "//server/share/file.js": strToU8("export {}"),
    })

    const drive = await installFromZipBytes(driveZip)
    const unc = await installFromZipBytes(uncZip)

    expect(drive.ok).toBe(false)
    if (!drive.ok) expect(drive.pathError?.reason).toBe("windows_path")
    expect(unc.ok).toBe(false)
    if (!unc.ok) expect(unc.pathError?.reason).toBe("windows_path")
  })

  test("accepts valid nested package assets and leaves store populated", async () => {
    const packageId = "com.example.nested-safe"
    const zipBytes = zipSync({
      "manifest.json": strToU8(
        JSON.stringify({
          packageId,
          name: "Nested safe",
          version: "1.0.0",
          engines: { yindex: ">=1 <2" },
          yindexApiVersion: 1,
          types: [
            {
              typeId: "nested.safe",
              name: "Nested",
              entry: "ui/index.html",
              defaultSize: { w: 12, h: 12 },
            },
          ],
          permissions: [],
          hostPermissions: [],
        }),
      ),
      "ui/index.html": strToU8("<!doctype html><title>nested</title>"),
      "assets/icons/pixel.png": Uint8Array.from([0x89, 0x50, 0x4e, 0x47]),
    })

    const result = await installFromZipBytes(zipBytes)
    const stored = await getPackage(packageId)

    expect(result.ok).toBe(true)
    expect(stored?.files["ui/index.html"]).toContain("nested")
    expect(stored?.files["assets/icons/pixel.png"]).toStartWith(
      "data:image/png;base64,",
    )
    await deletePackage(packageId)
  })

  test("rejects unsafe ZIP directory members before skip and leaves store unchanged", async () => {
    // Given: hostile directory-only members that currently skip endsWith('/') before validation
    const packageId = "com.example.dir-traversal"
    const cases: readonly {
      readonly member: string
      readonly reason: "dot_segment" | "absolute" | "backslash" | "windows_path"
    }[] = [
      { member: "../evil/", reason: "dot_segment" },
      { member: "nested/../../bad/", reason: "dot_segment" },
      { member: "/abs/dir/", reason: "absolute" },
      { member: "dir\\nested/", reason: "backslash" },
      { member: "C:/Windows/system32/", reason: "windows_path" },
      { member: "//server/share/", reason: "windows_path" },
    ]

    for (const fixture of cases) {
      const zipBytes = zipSync({
        "manifest.json": strToU8(
          JSON.stringify({
            packageId,
            name: "Dir traversal",
            version: "1.0.0",
            engines: { yindex: ">=1 <2" },
            yindexApiVersion: 1,
            types: [
              {
                typeId: "dir.traversal",
                name: "Dir",
                entry: "index.html",
                defaultSize: { w: 12, h: 12 },
              },
            ],
            permissions: [],
            hostPermissions: [],
          }),
        ),
        "index.html": strToU8("<!doctype html><title>ok</title>"),
        [fixture.member]: new Uint8Array(0),
      })

      // When
      const result = await installFromZipBytes(zipBytes)

      // Then: typed path error, no package store mutation
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.pathError).toEqual({
          kind: "unsafe_package_member_path",
          reason: fixture.reason,
        })
      }
      expect(await getPackage(packageId)).toBeUndefined()
    }
  })

  test("accepts legal nested directory members without storing directory keys", async () => {
    const packageId = "com.example.dir-ok"
    const zipBytes = zipSync({
      "manifest.json": strToU8(
        JSON.stringify({
          packageId,
          name: "Dir ok",
          version: "1.0.0",
          engines: { yindex: ">=1 <2" },
          yindexApiVersion: 1,
          types: [
            {
              typeId: "dir.ok",
              name: "Dir",
              entry: "ui/index.html",
              defaultSize: { w: 12, h: 12 },
            },
          ],
          permissions: [],
          hostPermissions: [],
        }),
      ),
      "ui/": new Uint8Array(0),
      "ui/index.html": strToU8("<!doctype html><title>nested-dir</title>"),
      "assets/icons/": new Uint8Array(0),
      "assets/icons/pixel.png": Uint8Array.from([0x89, 0x50, 0x4e, 0x47]),
    })

    const result = await installFromZipBytes(zipBytes)
    const stored = await getPackage(packageId)

    expect(result.ok).toBe(true)
    expect(stored?.files["ui/index.html"]).toContain("nested-dir")
    expect(stored?.files["assets/icons/pixel.png"]).toStartWith(
      "data:image/png;base64,",
    )
    expect(stored?.files["ui/"]).toBeUndefined()
    expect(stored?.files["assets/icons/"]).toBeUndefined()
    await deletePackage(packageId)
  })
})
