import type { CSSProperties } from "react"

export const wallpaperMediaStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
}

export function wallpaperSurfaceCanvasStyle(visible: boolean): CSSProperties {
  return {
    ...wallpaperMediaStyle,
    visibility: visible ? "visible" : "hidden",
  }
}
