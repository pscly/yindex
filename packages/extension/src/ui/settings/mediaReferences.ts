import {
  type HomeDocument,
  type MediaRef,
  type PageId,
  type Result,
  err,
} from "@yindex/domain"
import type {
  MediaCapacity,
  MediaStore,
  MediaStoreError,
} from "../../wallpaper/mediaStore"

export type MediaReferencePage = {
  readonly pageId: PageId
  readonly pageName: string
}

export type MediaInUseError = {
  readonly code: "in_use"
  readonly pageIds: readonly PageId[]
  readonly pageNames: readonly string[]
  readonly message: string
}

export function pagesUsingMediaRef(
  doc: HomeDocument,
  ref: MediaRef,
): readonly MediaReferencePage[] {
  const pages: MediaReferencePage[] = []
  for (const pageId of doc.sequence.pageIds) {
    const page = doc.pages[pageId]
    if (!page) continue
    const wallpaper = page.style.wallpaper
    if (
      wallpaper.kind !== "generative" &&
      String(wallpaper.mediaRef) === String(ref)
    ) {
      pages.push({ pageId, pageName: page.name })
    }
  }
  return pages
}

export function isMediaRefInUse(doc: HomeDocument, ref: MediaRef): boolean {
  return pagesUsingMediaRef(doc, ref).length > 0
}

export async function deleteMediaIfUnused(
  doc: HomeDocument,
  store: MediaStore,
  ref: MediaRef,
): Promise<Result<void, MediaInUseError | MediaStoreError>> {
  const usages = pagesUsingMediaRef(doc, ref)
  if (usages.length > 0) {
    const pageIds = usages.map(({ pageId }) => pageId)
    const pageNames = usages.map(({ pageName }) => pageName)
    return err({
      code: "in_use",
      pageIds,
      pageNames,
      message: `壁纸正被${pageNames.map((name) => `「${name}」`).join("、")}使用，请先为这些页更换壁纸。`,
    })
  }
  return store.delete(ref)
}

export function formatMediaBytes(byteLength: number): string {
  if (byteLength < 1024) return `${byteLength} B`
  const units = ["KB", "MB", "GB"] as const
  let value = byteLength / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const precision = value >= 10 || Number.isInteger(value) ? 0 : 1
  return `${value.toFixed(precision)} ${units[unitIndex]}`
}

export function capacityLabel(capacity: MediaCapacity): string {
  const assets = `壁纸 ${capacity.assetCount} 个 · ${formatMediaBytes(capacity.assetBytes)}`
  if (capacity.quotaBytes === null) return assets
  return `${assets} · 浏览器 ${formatMediaBytes(capacity.usedBytes)} / ${formatMediaBytes(capacity.quotaBytes)}`
}
