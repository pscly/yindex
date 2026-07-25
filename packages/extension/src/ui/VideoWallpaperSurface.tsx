import { BALANCED_SAFE_ANALYSIS } from "@yindex/domain"
import { useEffect, useRef, useState } from "react"
import {
  analyzePixelFrame,
  createVideoWallpaperSampler,
} from "../wallpaper/wallpaperAnalyzer"
import type { WallpaperMediaUrlLease } from "../wallpaper/wallpaperMediaUrl"
import { captureWallpaperVideoFrame } from "../wallpaper/wallpaperVideoFrame"
import type { WallpaperStageProps } from "./WallpaperStage"
import { wallpaperMediaStyle } from "./wallpaperSurfaceStyles"

export function VideoWallpaperSurface(props: {
  readonly lease: WallpaperMediaUrlLease | null
  readonly active: boolean
  readonly reducedMotion: boolean
  readonly onAnalysis: WallpaperStageProps["onAnalysis"]
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const failed = props.lease !== null && failedUrl === props.lease.url

  useEffect(() => {
    const video = videoRef.current
    if (video === null || props.lease === null || failed) return
    if (!props.active || props.reducedMotion) {
      video.pause()
      return
    }
    void video.play().catch((error: unknown) => {
      if (
        error instanceof DOMException &&
        (error.name === "AbortError" || error.name === "NotAllowedError")
      ) {
        return
      }
      if (error instanceof Error) {
        setFailedUrl(props.lease?.url ?? null)
        return
      }
      throw error
    })
  }, [failed, props.active, props.lease, props.reducedMotion])

  useEffect(() => {
    const video = videoRef.current
    if (video === null || props.lease === null || failed || !props.active)
      return
    if (props.reducedMotion) {
      const publish = (): void => {
        void captureWallpaperVideoFrame(video)
          .then(analyzePixelFrame)
          .then(props.onAnalysis)
          .catch((error: unknown) => {
            if (error instanceof Error) {
              props.onAnalysis({
                analysis: BALANCED_SAFE_ANALYSIS,
                usedFallback: true,
              })
              return
            }
            throw error
          })
      }
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) publish()
      else video.addEventListener("loadeddata", publish, { once: true })
      return () => video.removeEventListener("loadeddata", publish)
    }

    const sampler = createVideoWallpaperSampler({
      sample: () => captureWallpaperVideoFrame(video),
      onAnalysis: props.onAnalysis,
    })
    sampler.start()
    return () => sampler.dispose()
  }, [failed, props.active, props.lease, props.onAnalysis, props.reducedMotion])

  return (
    <video
      ref={videoRef}
      src={props.lease?.url}
      aria-hidden
      muted
      loop
      playsInline
      preload="auto"
      width={1920}
      height={1080}
      style={{
        ...wallpaperMediaStyle,
        opacity: props.lease === null || failed ? 0 : 1,
      }}
      onError={() => setFailedUrl(props.lease?.url ?? null)}
    />
  )
}
