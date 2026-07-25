import { useSyncExternalStore } from "react"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function mediaQuery(): MediaQueryList | null {
  return typeof window === "undefined"
    ? null
    : window.matchMedia(REDUCED_MOTION_QUERY)
}

function subscribe(onChange: () => void): () => void {
  const query = mediaQuery()
  if (query === null) return () => {}
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function snapshot(): boolean {
  return mediaQuery()?.matches ?? false
}

export function useOsPrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
