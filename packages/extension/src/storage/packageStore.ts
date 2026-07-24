import { type PackageManifest, parsePackageManifest } from "@yindex/widget-sdk"

const DB_NAME = "yindex-packages"
const DB_VERSION = 1
const STORE = "packages"

export type StoredPackage = {
  readonly packageId: string
  readonly version: string
  readonly manifest: PackageManifest
  readonly files: Readonly<Record<string, string>> // path -> text or data URL
  readonly installedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "packageId" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error("idb open failed"))
  })
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error("idb request failed"))
  })
}

export async function listPackages(): Promise<readonly StoredPackage[]> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, "readonly")
    const store = tx.objectStore(STORE)
    const all = await idbReq(store.getAll() as IDBRequest<StoredPackage[]>)
    db.close()
    return all
  } catch {
    return memoryPackages()
  }
}

export async function getPackage(
  packageId: string,
): Promise<StoredPackage | undefined> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, "readonly")
    const store = tx.objectStore(STORE)
    const row = await idbReq(
      store.get(packageId) as IDBRequest<StoredPackage | undefined>,
    )
    db.close()
    return row
  } catch {
    return memoryMap.get(packageId)
  }
}

export async function putPackage(pkg: StoredPackage): Promise<void> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    await idbReq(store.put(pkg))
    db.close()
  } catch {
    memoryMap.set(pkg.packageId, pkg)
  }
}

export async function deletePackage(packageId: string): Promise<void> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    await idbReq(store.delete(packageId))
    db.close()
  } catch {
    memoryMap.delete(packageId)
  }
}

const memoryMap = new Map<string, StoredPackage>()

function memoryPackages(): readonly StoredPackage[] {
  return [...memoryMap.values()]
}

export type ImportResult =
  | { readonly ok: true; readonly package: StoredPackage }
  | { readonly ok: false; readonly message: string }

/** Import from a map of relative paths to file text (already unzipped). */
export async function installPackageFromFiles(
  files: Readonly<Record<string, string>>,
): Promise<ImportResult> {
  const manifestText =
    files["manifest.json"] ??
    files["./manifest.json"] ??
    files["/manifest.json"]
  if (!manifestText) {
    return { ok: false, message: "缺少 manifest.json" }
  }
  let raw: unknown
  try {
    raw = JSON.parse(manifestText) as unknown
  } catch {
    return { ok: false, message: "manifest.json 不是合法 JSON" }
  }
  const parsed = parsePackageManifest(raw)
  if (!parsed.ok) {
    return { ok: false, message: parsed.error.message }
  }
  const stored: StoredPackage = {
    packageId: parsed.value.packageId,
    version: parsed.value.version,
    manifest: parsed.value,
    files,
    installedAt: Date.now(),
  }
  await putPackage(stored)
  return { ok: true, package: stored }
}
