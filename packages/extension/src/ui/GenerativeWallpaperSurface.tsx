import type { GenerativePreset } from "@yindex/domain"
import { useEffect, useRef } from "react"
import {
  type GenerativeRenderer,
  GenerativeRendererError,
  createGenerativeRenderer,
} from "../wallpaper/generativeRenderer"
import {
  type WallpaperAnalysisResult,
  analyzeGenerativeWallpaper,
} from "../wallpaper/wallpaperAnalyzer"
import { wallpaperMediaStyle } from "./wallpaperSurfaceStyles"

export function GenerativeWallpaperSurface(props: {
  readonly preset: GenerativePreset
  readonly active: boolean
  readonly reducedMotion: boolean
  readonly onAnalysis: (result: WallpaperAnalysisResult) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<GenerativeRenderer | null>(null)

  useEffect(() => {
    if (!props.active) return
    props.onAnalysis(analyzeGenerativeWallpaper(props.preset))
  }, [props.active, props.onAnalysis, props.preset])

  // biome-ignore lint/correctness/useExhaustiveDependencies: renderer identity is mount-scoped; prop changes use setters below.
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    let renderer: GenerativeRenderer
    try {
      renderer = createGenerativeRenderer({
        canvas,
        preset: props.preset,
        active: props.active,
        reducedMotion: props.reducedMotion,
      })
      renderer.start()
    } catch (error) {
      if (error instanceof GenerativeRendererError) return
      throw error
    }
    rendererRef.current = renderer
    const resize = (): void => {
      const bounds = canvas.getBoundingClientRect()
      renderer.resize(bounds.width, bounds.height)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => {
      observer.disconnect()
      rendererRef.current = null
      renderer.dispose()
    }
  }, [])

  useEffect(() => rendererRef.current?.setActive(props.active), [props.active])
  useEffect(
    () => rendererRef.current?.setReducedMotion(props.reducedMotion),
    [props.reducedMotion],
  )
  useEffect(() => rendererRef.current?.setPreset(props.preset), [props.preset])

  return <canvas ref={canvasRef} aria-hidden style={wallpaperMediaStyle} />
}
