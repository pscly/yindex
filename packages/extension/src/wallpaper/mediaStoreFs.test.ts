import { describe, expect, test } from "bun:test"
import { createMemoryFs } from "./mediaStoreFs"

describe("createMemoryFs contract", () => {
  test("writes and reads bytes with size and write count", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const directory = await fs.root.getDirectory("d", { create: true })
    const file = await directory.getFile("a.bin", { create: true })

    // When
    await file.writeBytes(new Uint8Array([1, 2, 3, 4]))

    // Then
    expect([...(await file.readBytes())]).toEqual([1, 2, 3, 4])
    expect(await file.byteLength()).toBe(4)
    expect(controls.writeCounts.get("a.bin")).toBe(1)
  })

  test("lists entries and reports their existence", async () => {
    // Given
    const { fs } = createMemoryFs()
    await fs.root.getDirectory("sub", { create: true })
    await fs.root.getFile("f.txt", { create: true })

    // When
    const entries = await fs.root.listEntries()

    // Then
    expect(entries.map((entry) => entry.name).sort()).toEqual(["f.txt", "sub"])
    expect(await fs.root.hasEntry("sub")).toBe(true)
    expect(await fs.root.hasEntry("missing")).toBe(false)
  })

  test("removeEntry deletes a file", async () => {
    // Given
    const { fs } = createMemoryFs()
    await fs.root.getFile("gone.bin", { create: true })

    // When
    await fs.root.removeEntry("gone.bin")

    // Then
    await expect(fs.root.getFile("gone.bin")).rejects.toMatchObject({
      name: "NotFoundError",
    })
  })

  test("shared handles report quota usage and peak", async () => {
    // Given
    const { fs, controls } = createMemoryFs({ quotaBytes: 1024 })
    await (await fs.root.getFile("x", { create: true })).writeBytes(
      new Uint8Array(10),
    )

    // When
    const estimate = await fs.estimate()

    // Then
    expect(estimate).toEqual({ usage: 10, quota: 1024 })
    expect(controls.peakUsage).toBe(10)
  })

  test("oversized write throws QuotaExceededError", async () => {
    // Given
    const { fs } = createMemoryFs({ quotaBytes: 8 })
    const file = await fs.root.getFile("big", { create: true })

    // When / Then
    await expect(file.writeBytes(new Uint8Array(16))).rejects.toMatchObject({
      name: "QuotaExceededError",
    })
  })

  test("write failure carries write operation", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const file = await fs.root.getFile("write", { create: true })
    controls.failNextWriteWithIo = true

    // When / Then
    await expect(file.writeBytes(new Uint8Array([1]))).rejects.toMatchObject({
      name: "FsWriteError",
      operation: "write",
    })
  })

  test("write plus abort failure carries abort operation", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const file = await fs.root.getFile("abort", { create: true })
    controls.failNextWriteWithIo = true
    controls.failNextAbortWithIo = true

    // When / Then
    await expect(file.writeBytes(new Uint8Array([1]))).rejects.toMatchObject({
      name: "FsWriteError",
      operation: "abort",
    })
  })

  test("close failure carries close operation and does not persist bytes", async () => {
    // Given
    const { fs, controls } = createMemoryFs()
    const file = await fs.root.getFile("close", { create: true })
    controls.failNextCloseWithIo = true

    // When / Then
    await expect(file.writeBytes(new Uint8Array([1]))).rejects.toMatchObject({
      name: "FsWriteError",
      operation: "close",
    })
    expect(await file.byteLength()).toBe(0)
  })
})
