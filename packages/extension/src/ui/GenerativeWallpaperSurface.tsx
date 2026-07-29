import type { GenerativePreset } from "@yindex/domain"
import { useEffect, useRef, useState } from "react"
import { createDirectGLSurface } from "../wallpaper/generativeCanvasSurface"
import {
  type BackendKind,
  type GenerativeRenderer,
  GenerativeRendererError,
  createGenerativeRenderer,
} from "../wallpaper/generativeRenderer"
import {
  type WallpaperAnalysisResult,
  analyzeGenerativeWallpaper,
} from "../wallpaper/wallpaperAnalyzer"
import { wallpaperSurfaceCanvasStyle } from "./wallpaperSurfaceStyles"
import { useVisibleWallpaperActivity } from "./wallpaperVisibility"

export function GenerativeWallpaperSurface(props: {
  readonly preset: GenerativePreset
  readonly active: boolean
  readonly reducedMotion: boolean
  readonly onAnalysis: (result: WallpaperAnalysisResult) => void
}) {
  const glCanvasRef = useRef<HTMLCanvasElement>(null)
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<GenerativeRenderer | null>(null)
  const [visibleSurface, setVisibleSurface] = useState<BackendKind | null>(null)
  const wallpaperActive = useVisibleWallpaperActivity(props.active)

  useEffect(() => {
    if (!props.active) return
    props.onAnalysis(analyzeGenerativeWallpaper(props.preset))
  }, [props.active, props.onAnalysis, props.preset])

  // biome-ignore lint/correctness/useExhaustiveDependencies: renderer identity is mount-scoped; prop changes use setters below.
  useEffect(() => {
    const glCanvas = glCanvasRef.current
    const fallbackCanvas = fallbackCanvasRef.current
    if (glCanvas === null || fallbackCanvas === null) return
    let renderer: GenerativeRenderer
    try {
      renderer = createGenerativeRenderer({
        canvas: fallbackCanvas,
        surfaces: {
          gl: createDirectGLSurface(glCanvas),
          canvas2d: fallbackCanvas,
        },
        preset: props.preset,
        active: wallpaperActive,
        reducedMotion: props.reducedMotion,
        onBackendChange: setVisibleSurface,
      })
      renderer.start()
    } catch (error) {
      if (error instanceof GenerativeRendererError) return
      throw error
    }
    rendererRef.current = renderer
    const resize = (): void => {
      const bounds = glCanvas.getBoundingClientRect()
      renderer.resize(bounds.width, bounds.height)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(glCanvas)
    return () => {
      observer.disconnect()
      rendererRef.current = null
      renderer.dispose()
    }
  }, [])

  useEffect(
    () => rendererRef.current?.setActive(wallpaperActive),
    [wallpaperActive],
  )
  useEffect(
    () => rendererRef.current?.setReducedMotion(props.reducedMotion),
    [props.reducedMotion],
  )
  useEffect(() => rendererRef.current?.setPreset(props.preset), [props.preset])

  return (
    <>
      <canvas
        ref={glCanvasRef}
        aria-hidden
        data-wallpaper-surface="webgl2"
        data-wallpaper-surface-visible={
          visibleSurface === "webgl2" ? "true" : undefined
        }
        style={wallpaperSurfaceCanvasStyle(visibleSurface === "webgl2")}
      />
      <canvas
        ref={fallbackCanvasRef}
        aria-hidden
        data-wallpaper-surface="canvas2d"
        data-wallpaper-surface-visible={
          visibleSurface === "canvas2d" ? "true" : undefined
        }
        style={wallpaperSurfaceCanvasStyle(visibleSurface === "canvas2d")}
      />
    </>
  )
}
