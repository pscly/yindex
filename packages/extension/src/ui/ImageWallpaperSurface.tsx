import { useEffect } from "react"
import { createStaticImageAnalyzer } from "../wallpaper/wallpaperAnalyzer"
import type { WallpaperMediaUrlLease } from "../wallpaper/wallpaperMediaUrl"
import type { WallpaperStageProps } from "./WallpaperStage"
import { wallpaperMediaStyle } from "./wallpaperSurfaceStyles"

const imageAnalyzer = createStaticImageAnalyzer()

export function ImageWallpaperSurface(props: {
  readonly lease: WallpaperMediaUrlLease | null
  readonly active: boolean
  readonly onAnalysis: WallpaperStageProps["onAnalysis"]
  readonly failed: boolean
  readonly onMediaError: () => void
}) {
  useEffect(() => {
    const lease = props.lease
    if (lease === null || !props.active) return
    let mounted = true
    void imageAnalyzer
      .analyze({ contentHash: lease.contentHash, blob: lease.blob })
      .then((result) => {
        if (mounted) props.onAnalysis(result)
      })
    return () => {
      mounted = false
    }
  }, [props.active, props.lease, props.onAnalysis])

  if (props.lease === null || props.failed) return null
  return (
    <img
      src={props.lease.url}
      alt=""
      aria-hidden
      width={1920}
      height={1080}
      style={wallpaperMediaStyle}
      onError={props.onMediaError}
    />
  )
}
