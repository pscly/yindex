import {
  type HomeDocument,
  migrateHomeDocument,
  serializeHomeDocument,
} from "@yindex/domain"
import { createDefaultHome } from "../default/createDefaultHome"

const HOME_KEY = "yindex.home"

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

export async function loadHomeDocument(): Promise<HomeDocument> {
  const raw = await readRaw()
  if (raw === undefined) {
    const fresh = createDefaultHome()
    await saveHomeDocument(fresh)
    return fresh
  }
  const migrated = migrateHomeDocument(raw)
  if (!migrated.ok) {
    console.error(
      "yindex: home migrate failed, resetting to default",
      migrated.error,
    )
    const fresh = createDefaultHome()
    await saveHomeDocument(fresh)
    return fresh
  }
  return migrated.value
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
  const fresh = createDefaultHome()
  await saveHomeDocument(fresh)
  return fresh
}
