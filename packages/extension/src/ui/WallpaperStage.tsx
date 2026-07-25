import type { Wallpaper } from "@yindex/domain"
import { assertNever } from "@yindex/domain"
import type { ReactNode } from "react"
import type { WallpaperAnalysisResult } from "../wallpaper/wallpaperAnalyzer"
import { GenerativeWallpaperSurface } from "./GenerativeWallpaperSurface"
import { ImageWallpaperSurface } from "./ImageWallpaperSurface"
import { VideoWallpaperSurface } from "./VideoWallpaperSurface"
import { useWallpaperMediaLease } from "./useWallpaperMediaLease"

export type WallpaperStageProps = {
  readonly wallpaper: Wallpaper
  readonly active: boolean
  readonly reducedMotion: boolean
  readonly fallbackBackground: string
  readonly dimColor: string
  readonly onAnalysis: (result: WallpaperAnalysisResult) => void
}

export function WallpaperStage(props: WallpaperStageProps) {
  const lease = useWallpaperMediaLease(props.wallpaper)
  let surface: ReactNode
  switch (props.wallpaper.kind) {
    case "generative":
      surface = (
        <GenerativeWallpaperSurface
          preset={props.wallpaper.generativePreset}
          active={props.active}
          reducedMotion={props.reducedMotion}
          onAnalysis={props.onAnalysis}
        />
      )
      break
    case "image":
      surface = (
        <ImageWallpaperSurface lease={lease} onAnalysis={props.onAnalysis} />
      )
      break
    case "video":
      surface = (
        <VideoWallpaperSurface
          lease={lease}
          active={props.active}
          reducedMotion={props.reducedMotion}
          onAnalysis={props.onAnalysis}
        />
      )
      break
    default:
      surface = assertNever(props.wallpaper)
  }

  return (
    <div
      aria-hidden
      data-wallpaper-kind={props.wallpaper.kind}
      data-wallpaper-active={props.active ? "true" : "false"}
      data-wallpaper-fallback={
        props.wallpaper.kind !== "generative" && lease === null
          ? "true"
          : undefined
      }
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: props.fallbackBackground,
      }}
    >
      {surface}
      <div
        data-wallpaper-dim="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `color-mix(in oklch, ${props.dimColor} ${Number(props.wallpaper.dim) * 100}%, transparent)`,
        }}
      />
    </div>
  )
}
