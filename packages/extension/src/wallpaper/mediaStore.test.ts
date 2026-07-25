import { describe, expect, test } from "bun:test"
import { mediaRef } from "@yindex/domain"
import { VIDEO_MAX_BYTES, createMediaStore, createMemoryFs } from "./mediaStore"
import { makeFile, openStore } from "./mediaStoreTestUtils.test"
import {
  ASSETS_DIR,
  BLOB_NAME,
  COMMIT_NAME,
  META_NAME,
  STORE_DIR as STORE,
} from "./mediaStoreTypes"

describe("MediaStore public seam", () => {
  test("imports image and video, lists typed metadata, reads bytes, deletes one, reports capacity", async () => {
    let seq = 0
    const { store } = await openStore({
      createId: () => `media_test_${++seq}`,
      now: () => 1_700_000_000_000,
    })
    const imgBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const vidBytes = new Uint8Array([0, 1, 2, 3, 4, 5])
    const imgR = await store.importFile(
      makeFile({ name: "wall.png", type: "image/png", bytes: imgBytes }),
    )
    const vidR = await store.importFile(
      makeFile({ name: "loop.mp4", type: "video/mp4", bytes: vidBytes }),
    )
    expect(imgR.ok).toBe(true)
    expect(vidR.ok).toBe(true)
    if (!imgR.ok || !vidR.ok) return
    expect(imgR.value.kind).toBe("image")
    expect(imgR.value.mimeType).toBe("image/png")
    expect(imgR.value.byteLength).toBe(4)
    expect(imgR.value.displayName).toBe("wall.png")
    expect(String(imgR.value.ref)).toBe("media_test_1")
    expect(vidR.value.kind).toBe("video")
    expect(vidR.value.byteLength).toBe(8)

    const listR = await store.list()
    expect(listR.ok).toBe(true)
    if (!listR.ok) return
    expect(listR.value).toHaveLength(2)

    const readImg = await store.read(imgR.value.ref)
    expect(readImg.ok).toBe(true)
    if (!readImg.ok) return
    expect([...readImg.value.bytes]).toEqual([...imgBytes])

    const delR = await store.delete(imgR.value.ref)
    expect(delR.ok).toBe(true)
    const list2 = await store.list()
    expect(list2.ok).toBe(true)
    if (!list2.ok) return
    expect(list2.value).toHaveLength(1)
    expect(list2.value[0]?.kind).toBe("video")

    const cap = await store.capacity()
    expect(cap.ok).toBe(true)
    if (!cap.ok) return
    expect(cap.value.assetCount).toBe(1)
    expect(cap.value.assetBytes).toBe(8)
    expect(cap.value.usedBytes).toBeGreaterThanOrEqual(8)
  })

  test("new store instance reconstructs list from same fs", async () => {
    const { fs } = createMemoryFs()
    let n = 0
    const first = await createMediaStore({
      fs,
      createId: () => `media_persist_${++n}`,
      now: () => 100,
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const imp = await first.value.importFile(
      makeFile({
        name: "a.jpg",
        type: "image/jpeg",
        bytes: new Uint8Array([10, 20]),
      }),
    )
    expect(imp.ok).toBe(true)

    const second = await createMediaStore({ fs })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    const list = await second.value.list()
    expect(list.ok).toBe(true)
    if (!list.ok) return
    expect(list.value).toHaveLength(1)
    expect(list.value[0]?.displayName).toBe("a.jpg")
    expect(list.value[0]?.byteLength).toBe(5)
  })

  test("rejects unsupported mime, empty file, video over 100 MiB", async () => {
    const { store } = await openStore()
    const bad = await store.importFile(
      makeFile({
        name: "x.txt",
        type: "text/plain",
        bytes: new Uint8Array([1]),
      }),
    )
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error.code).toBe("unsupported_mime")

    const empty = await store.importFile(
      makeFile({ name: "e.png", type: "image/png", bytes: new Uint8Array(0) }),
    )
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.error.code).toBe("empty_file")

    const over = await store.importFile(
      makeFile({
        name: "huge.mp4",
        type: "video/mp4",
        bytes: new Uint8Array(VIDEO_MAX_BYTES + 1),
      }),
    )
    expect(over.ok).toBe(false)
    if (!over.ok) {
      expect(over.error.code).toBe("video_too_large")
      if (over.error.code === "video_too_large") {
        expect(over.error.maxBytes).toBe(VIDEO_MAX_BYTES)
        expect(over.error.byteLength).toBe(VIDEO_MAX_BYTES + 1)
      }
    }
  })

  test("exactly 100 MiB video succeeds under ~101 MiB free (single blob write)", async () => {
    const metaBudget = 64 * 1024
    const quota = VIDEO_MAX_BYTES + metaBudget
    const { store, controls } = await openStore({
      quotaBytes: quota,
      createId: () => "media_edge_100mib",
    })
    const edge = await store.importFile(
      makeFile({
        name: "edge.mp4",
        type: "video/mp4",
        bytes: new Uint8Array(VIDEO_MAX_BYTES),
      }),
    )
    expect(edge.ok).toBe(true)
    if (!edge.ok) return
    expect(edge.value.byteLength).toBe(VIDEO_MAX_BYTES)
    expect(controls.writeCounts.get(BLOB_NAME)).toBe(1)
    expect(controls.peakUsage).toBeLessThan(VIDEO_MAX_BYTES * 2)
    expect(controls.peakUsage).toBeLessThanOrEqual(quota)
  })

  test("delete missing and read missing return not_found", async () => {
    const { store } = await openStore()
    const refR = mediaRef("media_does_not_exist")
    expect(refR.ok).toBe(true)
    if (!refR.ok) return
    const del = await store.delete(refR.value)
    expect(del.ok).toBe(false)
    if (!del.ok) expect(del.error.code).toBe("not_found")
    const rd = await store.read(refR.value)
    expect(rd.ok).toBe(false)
    if (!rd.ok) expect(rd.error.code).toBe("not_found")
  })

  test("duplicate display names get distinct refs", async () => {
    let i = 0
    const { store } = await openStore({
      createId: () => `media_dup_${++i}`,
    })
    const a = await store.importFile(
      makeFile({
        name: "same.png",
        type: "image/png",
        bytes: new Uint8Array([1]),
      }),
    )
    const b = await store.importFile(
      makeFile({
        name: "same.png",
        type: "image/png",
        bytes: new Uint8Array([2]),
      }),
    )
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(String(a.value.ref)).not.toBe(String(b.value.ref))
  })

  test("quota failure returns quota_exceeded", async () => {
    const { store } = await openStore({ quotaBytes: 32 })
    const r = await store.importFile(
      makeFile({
        name: "big.png",
        type: "image/png",
        bytes: new Uint8Array(64),
      }),
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("quota_exceeded")
  })

  test("storage paths use generated ids under assets dir not raw filenames", async () => {
    const { fs } = createMemoryFs()
    const opened = await createMediaStore({
      fs,
      createId: () => "media_safe_id_1",
    })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    await opened.value.importFile(
      makeFile({
        name: "../../evil name.png",
        type: "image/png",
        bytes: new Uint8Array([7]),
      }),
    )
    const storeDir = await fs.root.getDirectory(STORE, { create: false })
    const assets = await storeDir.getDirectory(ASSETS_DIR, { create: false })
    const entries = await assets.listEntries()
    expect(entries.map((e) => e.name)).toEqual(["media_safe_id_1"])
    const assetDir = await assets.getDirectory("media_safe_id_1", {
      create: false,
    })
    const names = (await assetDir.listEntries()).map((e) => e.name).sort()
    expect(names).toEqual([BLOB_NAME, COMMIT_NAME, META_NAME].sort())
  })
})
