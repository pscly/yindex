import type { Wallpaper } from "@yindex/domain"
import { assertNever } from "@yindex/domain"
import { type ReactNode, useCallback, useState } from "react"
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
  readonly onOpenSettings?: () => void
}

export function WallpaperStage(props: WallpaperStageProps) {
  const media = useWallpaperMediaLease(props.wallpaper)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const mediaFailed = media.lease !== null && failedUrl === media.lease.url
  const onMediaError = useCallback(() => {
    setFailedUrl(media.lease?.url ?? null)
  }, [media.lease])
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
        <ImageWallpaperSurface
          lease={media.lease}
          active={props.active}
          onAnalysis={props.onAnalysis}
          failed={mediaFailed}
          onMediaError={onMediaError}
        />
      )
      break
    case "video":
      surface = (
        <VideoWallpaperSurface
          lease={media.lease}
          active={props.active}
          reducedMotion={props.reducedMotion}
          onAnalysis={props.onAnalysis}
          failed={mediaFailed}
          onMediaError={onMediaError}
        />
      )
      break
    default:
      surface = assertNever(props.wallpaper)
  }
  const fallback =
    props.wallpaper.kind !== "generative" &&
    (media.lease === null || mediaFailed)
  const recoveryVisible =
    props.active &&
    (media.missing || mediaFailed) &&
    props.onOpenSettings !== undefined

  return (
    <div
      aria-hidden={recoveryVisible ? undefined : true}
      data-wallpaper-kind={props.wallpaper.kind}
      data-wallpaper-active={props.active ? "true" : "false"}
      data-wallpaper-analysis-active={props.active ? "true" : "false"}
      data-wallpaper-reduced-motion={props.reducedMotion ? "true" : "false"}
      data-wallpaper-fallback={fallback ? "true" : undefined}
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
        aria-hidden
        data-wallpaper-dim="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `color-mix(in oklch, ${props.dimColor} ${Number(props.wallpaper.dim) * 100}%, transparent)`,
        }}
      />
      {recoveryVisible ? (
        <WallpaperRecoveryAction onOpenSettings={props.onOpenSettings} />
      ) : null}
    </div>
  )
}

export function WallpaperRecoveryAction(props: {
  readonly onOpenSettings: () => void
}) {
  return (
    <button
      type="button"
      data-wallpaper-recovery="true"
      onClick={props.onOpenSettings}
      style={{
        position: "absolute",
        left: "50%",
        bottom: 32,
        zIndex: 2000,
        minHeight: 44,
        transform: "translateX(-50%)",
        pointerEvents: "auto",
        border: "1px solid color-mix(in oklch, white 24%, transparent)",
        borderRadius: 999,
        padding: "10px 16px",
        background:
          "color-mix(in oklch, var(--yindex-glass-tint) 64%, transparent)",
        color: "var(--yindex-lens-ink)",
        boxShadow:
          "inset 0 1px color-mix(in oklch, white 28%, transparent), 0 12px 32px color-mix(in oklch, black 24%, transparent)",
        backdropFilter: "blur(var(--yindex-glass-blur))",
        WebkitBackdropFilter: "blur(var(--yindex-glass-blur))",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        animation: "none",
        transition: "none",
      }}
    >
      壁纸缺失 · 打开设置重新选择
    </button>
  )
}
