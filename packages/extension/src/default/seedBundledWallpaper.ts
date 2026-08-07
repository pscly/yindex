import { type Wallpaper, createImageWallpaper } from "@yindex/domain"
import { createMediaStore } from "../wallpaper/mediaStore"
import type { MediaStore } from "../wallpaper/mediaStoreTypes"

const BUNDLED_WALLPAPER_PATH = "wallpapers/blue-skies.jpg"
const BUNDLED_WALLPAPER_NAME = "yindex-bundled-blue-skies.jpg"
const BUNDLED_WALLPAPER_DIM = 0

export type SeedBundledWallpaperDependencies = {
  readonly store?: MediaStore
  readonly fetchFile?: () => Promise<File>
}

async function fetchBundledFile(): Promise<File> {
  const url = chrome.runtime.getURL(BUNDLED_WALLPAPER_PATH)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`bundled wallpaper fetch failed: ${response.status}`)
  }
  const bytes = await response.arrayBuffer()
  return new File([bytes], BUNDLED_WALLPAPER_NAME, { type: "image/jpeg" })
}

function imageWallpaperFromRef(mediaRef: string): Wallpaper | null {
  const result = createImageWallpaper({
    mediaRef,
    dim: BUNDLED_WALLPAPER_DIM,
  })
  return result.ok ? result.value : null
}

/**
 * ownWallpaper: seed the bundled demo Wallpaper (蓝天白云) into the local
 * media store so the first-launch Home has a real picture. Idempotent —
 * reuses the previously imported asset. Any failure yields null and callers
 * keep the generative default.
 */
export async function seedBundledWallpaper(
  dependencies: SeedBundledWallpaperDependencies = {},
): Promise<Wallpaper | null> {
  try {
    let store = dependencies.store
    if (!store) {
      const created = await createMediaStore()
      if (!created.ok) return null
      store = created.value
    }
    const listed = await store.list()
    if (listed.ok) {
      const existing = listed.value.find(
        (asset) => asset.displayName === BUNDLED_WALLPAPER_NAME,
      )
      if (existing) return imageWallpaperFromRef(String(existing.ref))
    }
    const fetchFile = dependencies.fetchFile ?? fetchBundledFile
    const imported = await store.importFile(await fetchFile())
    if (!imported.ok) return null
    return imageWallpaperFromRef(String(imported.value.ref))
  } catch {
    return null
  }
}
