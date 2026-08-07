import { parseSafeNavigationUrl } from "../navigation/safeNavigationUrl"

/** A single website entry in the Shortcuts grid. */
export type ShortcutItem = {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly favicon?: string
}

/**
 * A single-level grouping cell in the Shortcuts grid.
 * Folders contain only plain Shortcuts — never other folders.
 */
export type ShortcutFolder = {
  readonly id: string
  readonly title: string
  readonly items: readonly ShortcutItem[]
}

/** One grid cell: either a Shortcut or a single-level Shortcut Folder. */
export type ShortcutCell = ShortcutItem | ShortcutFolder

export type ShortcutsWidgetConfig = {
  readonly items: readonly ShortcutCell[]
}

type CellRecord = {
  readonly favicon?: unknown
  readonly id?: unknown
  readonly items?: unknown
  readonly title?: unknown
  readonly url?: unknown
  readonly [key: string]: unknown
}

function isRecord(value: unknown): value is CellRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string"
}

export function isShortcutItem(value: unknown): value is ShortcutItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    isOptionalString(value.favicon)
  )
}

/**
 * Folder guard. Nested folders are rejected structurally: a folder member
 * must satisfy isShortcutItem, which requires a string `url` that folders
 * never carry.
 */
export function isShortcutFolder(value: unknown): value is ShortcutFolder {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.url !== "string" &&
    Array.isArray(value.items) &&
    value.items.every(isShortcutItem)
  )
}

export function isShortcutCell(value: unknown): value is ShortcutCell {
  return isShortcutItem(value) || isShortcutFolder(value)
}

export function isShortcutsWidgetConfig(
  value: unknown,
): value is ShortcutsWidgetConfig {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isShortcutCell)
  )
}

const FAVICON_SIZE = 64
const RETIRED_FAVICON_MARKER = "google.com/s2/favicons"

type ChromeRuntimeLike = {
  readonly getURL?: ((path: string) => string) | undefined
}

function faviconBaseUrl(): string {
  const scope = globalThis as {
    readonly chrome?: { readonly runtime?: ChromeRuntimeLike | undefined }
  }
  const runtime = scope.chrome?.runtime
  if (runtime && typeof runtime.getURL === "function") {
    return runtime.getURL("_favicon/")
  }
  return "chrome-extension://yindex/_favicon/"
}

/**
 * Local favicon via Chrome's `_favicon` subresource (requires the `favicon`
 * MV3 permission). No remote icon service is ever contacted.
 */
export function faviconForUrl(url: string): string | undefined {
  const safe = parseSafeNavigationUrl(url)
  if (!safe.ok) return undefined
  return `${faviconBaseUrl()}?pageUrl=${encodeURIComponent(safe.value)}&size=${FAVICON_SIZE}`
}

/**
 * Picks the icon source for a Shortcut. Stored favicons win, except ones
 * pointing at the retired Google s2 service, which fall back to the local
 * `_favicon` mechanism.
 */
export function resolveShortcutIcon(item: ShortcutItem): string | undefined {
  if (item.favicon && !item.favicon.includes(RETIRED_FAVICON_MARKER)) {
    return item.favicon
  }
  return faviconForUrl(item.url)
}

export type ShortcutFallbackPalette = {
  readonly background: string
  readonly foreground: string
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** Deterministic muted hue (0–359) derived from the shortcut's hostname. */
export function shortcutFallbackHue(url: string): number {
  const host = hostnameOf(url)
  let hash = 0
  for (let i = 0; i < host.length; i += 1) {
    hash = (hash * 31 + host.charCodeAt(i)) % 360
  }
  return hash
}

/** Soft pastel letter-tile colors for sites without a cached favicon. */
export function shortcutFallbackPalette(url: string): ShortcutFallbackPalette {
  const hue = shortcutFallbackHue(url)
  return {
    background: `oklch(0.84 0.07 ${hue})`,
    foreground: `oklch(0.38 0.09 ${hue})`,
  }
}

export const FOLDER_PREVIEW_LIMIT = 4

/** First members shown in the closed folder's 2×2 mini preview. */
export function folderPreviewItems(
  folder: ShortcutFolder,
  limit = FOLDER_PREVIEW_LIMIT,
): readonly ShortcutItem[] {
  return folder.items.slice(0, Math.max(0, limit))
}
