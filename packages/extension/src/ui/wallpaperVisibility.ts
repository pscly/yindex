import { useSyncExternalStore } from "react"

const visibleServerSnapshot = (): DocumentVisibilityState => "visible"
const visibilitySnapshot = (): DocumentVisibilityState =>
  document.visibilityState

function subscribeToVisibility(onVisibilityChange: () => void): () => void {
  document.addEventListener("visibilitychange", onVisibilityChange)
  return () =>
    document.removeEventListener("visibilitychange", onVisibilityChange)
}

export function isWallpaperActive(
  pageActive: boolean,
  visibilityState: DocumentVisibilityState,
): boolean {
  return pageActive && visibilityState !== "hidden"
}

export function useVisibleWallpaperActivity(pageActive: boolean): boolean {
  const visibilityState = useSyncExternalStore(
    subscribeToVisibility,
    visibilitySnapshot,
    visibleServerSnapshot,
  )
  return isWallpaperActive(pageActive, visibilityState)
}
