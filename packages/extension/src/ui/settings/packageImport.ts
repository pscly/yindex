import { strFromU8, unzipSync } from "fflate"
import {
  type ImportResult,
  installPackageFromFiles,
} from "../../storage/packageStore"

export function normalizeZipPaths(
  files: Record<string, string>,
): Record<string, string> {
  const keys = Object.keys(files)
  if (keys.length === 0) return files
  const first = keys[0]
  if (!first) return files
  const slash = first.indexOf("/")
  if (slash <= 0) return files
  const prefix = first.slice(0, slash + 1)
  if (!keys.every((k) => k.startsWith(prefix))) return files
  const next: Record<string, string> = {}
  for (const k of keys) {
    const v = files[k]
    if (v === undefined) continue
    next[k.slice(prefix.length)] = v
  }
  return next
}

export async function installFromZipBytes(
  buf: Uint8Array,
): Promise<ImportResult> {
  const files: Record<string, string> = {}
  const unzipped = unzipSync(buf)
  for (const [path, data] of Object.entries(unzipped)) {
    if (path.endsWith("/")) continue
    const clean = path.replace(/^\/+/, "").replace(/\\/g, "/")
    files[clean] = strFromU8(data)
  }
  return installPackageFromFiles(normalizeZipPaths(files))
}

export async function installFromManifestJson(
  text: string,
): Promise<ImportResult> {
  return installPackageFromFiles({ "manifest.json": text })
}

export async function fetchBundledPomodoro(): Promise<
  | { readonly ok: true; readonly files: Record<string, string> }
  | { readonly ok: false; readonly message: string }
> {
  const base =
    typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL("examples/pomodoro/")
      : new URL("examples/pomodoro/", document.baseURI).href
  const manifestRes = await fetch(`${base}manifest.json`)
  const timerRes = await fetch(`${base}timer.html`)
  if (!manifestRes.ok || !timerRes.ok) {
    return { ok: false, message: "找不到内置示例包资源" }
  }
  return {
    ok: true,
    files: {
      "manifest.json": await manifestRes.text(),
      "timer.html": await timerRes.text(),
    },
  }
}
