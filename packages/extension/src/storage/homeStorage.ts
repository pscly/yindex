import {
  type HomeDocument,
  type Wallpaper,
  migrateHomeDocument,
  serializeHomeDocument,
} from "@yindex/domain"
import { createDefaultHome } from "../default/createDefaultHome"
import { seedBundledWallpaper } from "../default/seedBundledWallpaper"

const HOME_KEY = "yindex.home"
const BUNDLED_FLAG_KEY = "yindex.bundledWallpaperApplied"

type StorageArea = {
  get: (
    keys?: string | string[] | Record<string, unknown> | null,
  ) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
  remove: (keys: string | string[]) => Promise<void>
}

function getLocal(): StorageArea | null {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    return {
      get: (keys) =>
        new Promise((resolve, reject) => {
          chrome.storage.local.get(keys ?? null, (result) => {
            const err = chrome.runtime.lastError
            if (err) reject(new Error(err.message))
            else resolve(result as Record<string, unknown>)
          })
        }),
      set: (items) =>
        new Promise((resolve, reject) => {
          chrome.storage.local.set(items, () => {
            const err = chrome.runtime.lastError
            if (err) reject(new Error(err.message))
            else resolve()
          })
        }),
      remove: (keys) =>
        new Promise((resolve, reject) => {
          chrome.storage.local.remove(keys, () => {
            const err = chrome.runtime.lastError
            if (err) reject(new Error(err.message))
            else resolve()
          })
        }),
    }
  }
  return null
}

/** Fallback for vite dev outside extension */
const memory = new Map<string, unknown>()

async function readRaw(): Promise<unknown> {
  const local = getLocal()
  if (local) {
    const result = await local.get(HOME_KEY)
    return result[HOME_KEY]
  }
  return memory.get(HOME_KEY)
}

async function writeRaw(value: unknown): Promise<void> {
  const local = getLocal()
  if (local) {
    await local.set({ [HOME_KEY]: value })
    return
  }
  memory.set(HOME_KEY, value)
}

async function freshDefaultHome(): Promise<HomeDocument> {
  const bundled = await seedBundledWallpaper()
  return createDefaultHome(
    bundled ? { momentWallpaper: bundled } : {},
  )
}

async function readBundledFlag(): Promise<boolean> {
  const local = getLocal()
  if (local) {
    const result = await local.get(BUNDLED_FLAG_KEY)
    return result[BUNDLED_FLAG_KEY] === true
  }
  return memory.get(BUNDLED_FLAG_KEY) === true
}

async function writeBundledFlag(): Promise<void> {
  const local = getLocal()
  if (local) {
    await local.set({ [BUNDLED_FLAG_KEY]: true })
    return
  }
  memory.set(BUNDLED_FLAG_KEY, true)
}

export type BundledWallpaperMigrationDependencies = {
  readonly seed?: () => Promise<Wallpaper | null>
  readonly readFlag?: () => Promise<boolean>
  readonly writeFlag?: () => Promise<void>
  readonly save?: (doc: HomeDocument) => Promise<void>
}

/**
 * One-time migration: existing installs keep a stored Home, so the bundled
 * 蓝天白云 Wallpaper never reaches them through the first-launch path. On the
 * first load after upgrade, point the landing Page at the bundled image —
 * unless the user already chose a media Wallpaper — then never touch it again.
 */
export async function applyBundledWallpaperOnce(
  doc: HomeDocument,
  dependencies: BundledWallpaperMigrationDependencies = {},
): Promise<HomeDocument> {
  const readFlag = dependencies.readFlag ?? readBundledFlag
  const writeFlag = dependencies.writeFlag ?? writeBundledFlag
  const save = dependencies.save ?? saveHomeDocument
  if (await readFlag()) return doc

  const landingId = doc.sequence.pageIds[0]
  const landing = landingId === undefined ? undefined : doc.pages[landingId]
  if (landing && landing.style.wallpaper.kind !== "generative") {
    await writeFlag()
    return doc
  }

  const seed = dependencies.seed ?? seedBundledWallpaper
  const wallpaper = await seed()
  if (!wallpaper || !landing) return doc

  const next: HomeDocument = {
    ...doc,
    pages: {
      ...doc.pages,
      [landing.id]: {
        ...landing,
        style: { ...landing.style, wallpaper },
      },
    },
  }
  await save(next)
  await writeFlag()
  return next
}

export async function loadHomeDocument(): Promise<HomeDocument> {
  const raw = await readRaw()
  if (raw === undefined) {
    const fresh = await freshDefaultHome()
    await saveHomeDocument(fresh)
    return await applyBundledWallpaperOnce(fresh)
  }
  const migrated = migrateHomeDocument(raw)
  if (!migrated.ok) {
    console.error(
      "yindex: home migrate failed, resetting to default",
      migrated.error,
    )
    const fresh = await freshDefaultHome()
    await saveHomeDocument(fresh)
    return await applyBundledWallpaperOnce(fresh)
  }
  return await applyBundledWallpaperOnce(migrated.value)
}

export async function saveHomeDocument(doc: HomeDocument): Promise<void> {
  await writeRaw(serializeHomeDocument(doc))
}

export async function resetHomeDocument(
  mode: "default3" | "full",
): Promise<HomeDocument> {
  if (mode === "full") {
    const local = getLocal()
    if (local) await local.remove(HOME_KEY)
    else memory.delete(HOME_KEY)
  }
  const fresh = await freshDefaultHome()
  await saveHomeDocument(fresh)
  return await applyBundledWallpaperOnce(fresh)
}
