import type { HomeDocument } from "@yindex/domain"
import {
  type MediaStore,
  type MediaStoreError,
  createMediaStore,
} from "../wallpaper/mediaStore"
import { resetHomeDocument } from "./homeStorage"
import { clearAllPackages } from "./packageStore"

export type ResetAllLocalDataOptions = {
  readonly mediaStore?: MediaStore
}

export class FullResetMediaError extends Error {
  readonly code = "media_reset_failed" as const

  constructor(readonly mediaError: MediaStoreError) {
    super(`清除壁纸失败：${mediaError.message}`)
    this.name = "FullResetMediaError"
  }
}

export function resetHomeOnly(): Promise<HomeDocument> {
  return resetHomeDocument("default3")
}

export async function resetAllLocalData(
  options: ResetAllLocalDataOptions = {},
): Promise<HomeDocument> {
  let store = options.mediaStore
  if (!store) {
    const created = await createMediaStore()
    if (!created.ok) throw new FullResetMediaError(created.error)
    store = created.value
  }

  const listed = await store.list()
  if (!listed.ok) throw new FullResetMediaError(listed.error)
  for (const asset of listed.value) {
    const deleted = await store.delete(asset.ref)
    if (!deleted.ok) throw new FullResetMediaError(deleted.error)
  }

  await clearAllPackages()
  return resetHomeDocument("full")
}
