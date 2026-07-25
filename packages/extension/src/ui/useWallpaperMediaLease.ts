import type { Wallpaper } from "@yindex/domain"
import { useEffect, useState } from "react"
import {
  type WallpaperMediaUrlLease,
  wallpaperMediaUrlPool,
} from "../wallpaper/wallpaperMediaUrl"

export function useWallpaperMediaLease(
  wallpaper: Wallpaper,
): WallpaperMediaUrlLease | null {
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

  return loaded?.sourceKey === sourceKey ? loaded.lease : null
}
