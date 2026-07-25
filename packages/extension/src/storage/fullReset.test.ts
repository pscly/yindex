import { beforeEach, describe, expect, test } from "bun:test"
import type { HomeDocument } from "@yindex/domain"
import { createDefaultHome } from "../default/createDefaultHome"
import { makeFile, openStore } from "../wallpaper/mediaStoreTestUtils.test"
import { resetAllLocalData, resetHomeOnly } from "./fullReset"
import { loadHomeDocument, saveHomeDocument } from "./homeStorage"
import {
  type StoredPackage,
  deletePackage,
  listPackages,
  putPackage,
} from "./packageStore"

const TEST_PACKAGE: StoredPackage = {
  packageId: "com.yindex.test.reset",
  version: "1.0.0",
  manifest: {
    packageId: "com.yindex.test.reset",
    name: "Reset Test Widget",
    version: "1.0.0",
    engines: { yindex: ">=1 <2" },
    yindexApiVersion: 1,
    types: [
      {
        typeId: "reset.test",
        name: "Reset Test",
        entry: "widget.html",
      },
    ],
    permissions: [],
    hostPermissions: [],
  },
  files: { "widget.html": "<p>reset</p>" },
  installedAt: 1,
}

function customizedHome(): HomeDocument {
  const doc = createDefaultHome()
  return {
    ...doc,
    settings: { ...doc.settings, rememberLastPage: true },
  }
}

async function clearPackagesForTest(): Promise<void> {
  for (const storedPackage of await listPackages()) {
    await deletePackage(storedPackage.packageId)
  }
}

beforeEach(async () => {
  await clearPackagesForTest()
})

describe("local data reset boundaries", () => {
  test("Given Home, media, and a Package, When Home-only reset runs, Then only Home becomes the default", async () => {
    // Given
    const { store } = await openStore({ createId: () => "media_home_only" })
    const imported = await store.importFile(
      makeFile({
        name: "kept.png",
        type: "image/png",
        bytes: new Uint8Array([1, 2, 3, 4]),
      }),
    )
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    await putPackage(TEST_PACKAGE)
    await saveHomeDocument(customizedHome())

    // When
    const resetDoc = await resetHomeOnly()

    // Then
    expect(resetDoc).toEqual(createDefaultHome())
    expect(await loadHomeDocument()).toEqual(createDefaultHome())
    const media = await store.list()
    expect(media.ok).toBe(true)
    if (media.ok) expect(media.value).toHaveLength(1)
    expect((await listPackages()).map(({ packageId }) => packageId)).toContain(
      TEST_PACKAGE.packageId,
    )

    await store.delete(imported.value.ref)
    await deletePackage(TEST_PACKAGE.packageId)
  })

  test("Given Home, media, and a Package, When full reset runs, Then all local stores are emptied and default Home is written", async () => {
    // Given
    const { store } = await openStore({ createId: () => "media_full_reset" })
    const imported = await store.importFile(
      makeFile({
        name: "removed.mp4",
        type: "video/mp4",
        bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      }),
    )
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    await putPackage(TEST_PACKAGE)
    await saveHomeDocument(customizedHome())

    // When
    const resetDoc = await resetAllLocalData({ mediaStore: store })

    // Then
    expect(resetDoc).toEqual(createDefaultHome())
    expect(await loadHomeDocument()).toEqual(createDefaultHome())
    const media = await store.list()
    expect(media.ok).toBe(true)
    if (media.ok) expect(media.value).toHaveLength(0)
    expect(await listPackages()).toHaveLength(0)
  })
})
