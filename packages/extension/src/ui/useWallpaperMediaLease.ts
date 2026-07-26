import type { Wallpaper } from "@yindex/domain"
import { useEffect, useState } from "react"
import {
  type WallpaperMediaUrlLease,
  wallpaperMediaUrlPool,
} from "../wallpaper/wallpaperMediaUrl"

export type WallpaperMediaLeaseResult = {
  readonly lease: WallpaperMediaUrlLease | null
  readonly missing: boolean
}

export function useWallpaperMediaLease(
  wallpaper: Wallpaper,
): WallpaperMediaLeaseResult {
  const source = wallpaper.kind === "generative" ? null : wallpaper
  const sourceKey =
    source === null ? "generative" : `${source.kind}:${source.mediaRef}`
  const [loaded, setLoaded] = useState<{
    readonly sourceKey: string
    readonly lease: WallpaperMediaUrlLease | null
  } | null>(null)

  useEffect(() => {
    if (source === null) return
    let mounted = true
    let held: WallpaperMediaUrlLease | null = null
    void wallpaperMediaUrlPool()
      .acquire(source.mediaRef, source.kind)
      .then((lease) => {
        if (!mounted) {
          lease?.release()
          return
        }
        held = lease
        setLoaded({ sourceKey, lease })
      })
    return () => {
      mounted = false
      held?.release()
    }
  }, [source, sourceKey])

  if (source === null || loaded?.sourceKey !== sourceKey) {
    return { lease: null, missing: false }
  }
  return { lease: loaded.lease, missing: loaded.lease === null }
}
