import { BALANCED_SAFE_ANALYSIS } from "@yindex/domain"
import { useEffect, useRef, useState } from "react"
import {
  analyzePixelFrame,
  createVideoWallpaperSampler,
} from "../wallpaper/wallpaperAnalyzer"
import type { WallpaperMediaUrlLease } from "../wallpaper/wallpaperMediaUrl"
import { captureWallpaperVideoFrame } from "../wallpaper/wallpaperVideoFrame"
import type { WallpaperStageProps } from "./WallpaperStage"
import {
  captureVideoWallpaperStill,
  createVideoStillUrlOwner,
  shouldPlayVideoWallpaper,
  videoWallpaperPresentation,
} from "./videoWallpaperStill"
import type { VideoStillUrlOwner } from "./videoWallpaperStill"
import { wallpaperMediaStyle } from "./wallpaperSurfaceStyles"
import { useVisibleWallpaperActivity } from "./wallpaperVisibility"

export type VideoWallpaperAnalysisMode = "inactive" | "single-frame" | "sampled"

export {
  captureVideoWallpaperStill,
  createVideoStillUrlOwner,
  resolveVideoStillCaptureSize,
  scaleVideoStillDimensions,
  shouldPlayVideoWallpaper,
  videoWallpaperPresentation,
} from "./videoWallpaperStill"
export type {
  VideoStillCapture,
  VideoStillDimensions,
  VideoStillUrlOwner,
  VideoWallpaperPresentation,
} from "./videoWallpaperStill"

export function videoWallpaperAnalysisMode(
  active: boolean,
  reducedMotion: boolean,
): VideoWallpaperAnalysisMode {
  if (!active) return "inactive"
  return reducedMotion ? "single-frame" : "sampled"
}

export function VideoWallpaperSurface(props: {
  readonly lease: WallpaperMediaUrlLease | null
  readonly active: boolean
  readonly reducedMotion: boolean
  readonly onAnalysis: WallpaperStageProps["onAnalysis"]
  readonly failed: boolean
  readonly onMediaError: () => void
  readonly createStillOwner?: () => VideoStillUrlOwner
}) {
  const createStillOwner = props.createStillOwner ?? createVideoStillUrlOwner
  const videoRef = useRef<HTMLVideoElement>(null)
  const stillOwnerRef = useRef<ReturnType<
    typeof createVideoStillUrlOwner
  > | null>(null)
  const wallpaperActive = useVisibleWallpaperActivity(props.active)
  const presentation = videoWallpaperPresentation(
    wallpaperActive,
    props.reducedMotion,
  )
  const [stillUrl, setStillUrl] = useState<string | null>(null)
  const mediaVisible = props.lease !== null && !props.failed

  useEffect(() => {
    const owner = createStillOwner()
    stillOwnerRef.current = owner
    return () => {
      owner.dispose()
      if (stillOwnerRef.current === owner) stillOwnerRef.current = null
    }
  }, [createStillOwner])

  useEffect(() => {
    const video = videoRef.current
    if (video === null || props.lease === null || props.failed) return
    if (!shouldPlayVideoWallpaper(presentation)) {
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
        props.onMediaError()
        return
      }
      throw error
    })
  }, [presentation, props.failed, props.lease, props.onMediaError])

  useEffect(() => {
    const owner = stillOwnerRef.current
    if (owner === null) return
    if (
      presentation !== "static-still" ||
      props.lease === null ||
      props.failed
    ) {
      owner.clear()
      setStillUrl(null)
      return
    }
    const video = videoRef.current
    if (video === null) return
    const generation = owner.beginCapture()
    let captureIsCurrent = true
    owner.clear()
    setStillUrl(null)

    const publishStill = (): void => {
      void captureVideoWallpaperStill(video)
        .then((still) => {
          const accepted = owner.publishIfCurrent(generation, still.objectUrl)
          if (accepted) setStillUrl(still.objectUrl)
        })
        .catch((error: unknown) => {
          if (error instanceof Error) {
            if (captureIsCurrent) setStillUrl(null)
            return
          }
          throw error
        })
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) publishStill()
    else video.addEventListener("loadeddata", publishStill, { once: true })

    return () => {
      captureIsCurrent = false
      video.removeEventListener("loadeddata", publishStill)
      owner.beginCapture()
      owner.clear()
    }
  }, [presentation, props.failed, props.lease])

  useEffect(() => {
    const video = videoRef.current
    const analysisMode = videoWallpaperAnalysisMode(
      wallpaperActive,
      props.reducedMotion,
    )
    if (
      video === null ||
      props.lease === null ||
      props.failed ||
      analysisMode === "inactive"
    ) {
      return
    }
    if (analysisMode === "single-frame") {
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
  }, [
    props.failed,
    props.lease,
    props.onAnalysis,
    props.reducedMotion,
    wallpaperActive,
  ])

  const stillReady = stillUrl !== null && mediaVisible
  const videoOpacity =
    !mediaVisible || (presentation === "static-still" && stillReady) ? 0 : 1

  return (
    <>
      <video
        ref={videoRef}
        src={props.lease?.url}
        poster={stillUrl ?? undefined}
        aria-hidden
        muted
        loop
        playsInline
        preload="auto"
        width={1920}
        height={1080}
        data-video-presentation={presentation}
        style={{
          ...wallpaperMediaStyle,
          opacity: videoOpacity,
        }}
        onError={props.onMediaError}
      />
      {presentation === "static-still" ? (
        <img
          src={stillUrl ?? undefined}
          alt=""
          aria-hidden
          width={1920}
          height={1080}
          data-video-wallpaper-still={stillReady ? "ready" : "pending"}
          style={{
            ...wallpaperMediaStyle,
            opacity: stillReady ? 1 : 0,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </>
  )
}
