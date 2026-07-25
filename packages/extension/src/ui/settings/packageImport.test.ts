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
})
