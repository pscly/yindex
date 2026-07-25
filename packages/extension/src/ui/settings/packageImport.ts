import { strFromU8, unzipSync } from "fflate"
import {
  type ImportResult,
  installPackageFromFiles,
} from "../../storage/packageStore"

const TEXT_FILE_EXTENSIONS = new Set([
  "css",
  "csv",
  "htm",
  "html",
  "js",
  "json",
  "map",
  "md",
  "mjs",
  "svg",
  "txt",
  "webmanifest",
  "xml",
])

const BINARY_MEDIA_TYPES: Readonly<Record<string, string>> = {
  avif: "image/avif",
  gif: "image/gif",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  ogg: "audio/ogg",
  otf: "font/otf",
  png: "image/png",
  ttf: "font/ttf",
  wav: "audio/wav",
  webm: "video/webm",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
}

function fileExtension(path: string): string {
  const filename = path.slice(path.lastIndexOf("/") + 1)
  const dot = filename.lastIndexOf(".")
  return dot < 0 ? "" : filename.slice(dot + 1).toLowerCase()
}

function bytesToBase64(data: Uint8Array): string {
  let binary = ""
  const chunkSize = 0x8000
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    binary += String.fromCharCode(...data.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function decodePackageFile(path: string, data: Uint8Array): string {
  const extension = fileExtension(path)
  if (TEXT_FILE_EXTENSIONS.has(extension)) return strFromU8(data)
  const mediaType = BINARY_MEDIA_TYPES[extension] ?? "application/octet-stream"
  return `data:${mediaType};base64,${bytesToBase64(data)}`
}

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
    files[clean] = decodePackageFile(clean, data)
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
