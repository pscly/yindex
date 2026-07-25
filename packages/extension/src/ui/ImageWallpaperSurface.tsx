import { useEffect, useState } from "react"
import { createStaticImageAnalyzer } from "../wallpaper/wallpaperAnalyzer"
import type { WallpaperMediaUrlLease } from "../wallpaper/wallpaperMediaUrl"
import type { WallpaperStageProps } from "./WallpaperStage"
import { wallpaperMediaStyle } from "./wallpaperSurfaceStyles"

const imageAnalyzer = createStaticImageAnalyzer()

export function ImageWallpaperSurface(props: {
  readonly lease: WallpaperMediaUrlLease | null
  readonly onAnalysis: WallpaperStageProps["onAnalysis"]
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const failed = props.lease !== null && failedUrl === props.lease.url

  useEffect(() => {
    const lease = props.lease
    if (lease === null) return
    let mounted = true
    void imageAnalyzer
      .analyze({ contentHash: lease.contentHash, blob: lease.blob })
      .then((result) => {
        if (mounted) props.onAnalysis(result)
      })
    return () => {
      mounted = false
    }
  }, [props.lease, props.onAnalysis])

  if (props.lease === null || failed) return null
  return (
    <img
      src={props.lease.url}
      alt=""
      aria-hidden
      width={1920}
      height={1080}
      style={wallpaperMediaStyle}
      onError={() => setFailedUrl(props.lease?.url ?? null)}
    />
  )
}
