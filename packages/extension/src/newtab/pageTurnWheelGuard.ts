export { ambientMotionAllowed } from "./ambientMotion"

function isDomAvailable(): boolean {
  return typeof Element !== "undefined"
}

export function isFormControlTarget(target: EventTarget | null): boolean {
  if (target == null || !isDomAvailable()) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}

export function isScrollableConsuming(
  target: EventTarget | null,
  deltaY: number,
): boolean {
  if (target == null || !isDomAvailable()) return false
  if (!(target instanceof Element)) return false
  const scrollable = target.closest("[data-scrollable='true']")
  if (!(scrollable instanceof HTMLElement)) return false
  if (scrollable.scrollHeight <= scrollable.clientHeight) return false
  if (
    deltaY > 0 &&
    scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 1
  ) {
    return true
  }
  if (deltaY < 0 && scrollable.scrollTop > 0) return true
  return false
}

export function shouldStealWheel(
  target: EventTarget | null,
  deltaY: number,
): boolean {
  if (isFormControlTarget(target)) return false
  if (isScrollableConsuming(target, deltaY)) return false
  return true
}

export function prefersReducedMotion(
  setting: "system" | "force" | "never",
  matchMedia?: (query: string) => { readonly matches: boolean },
): boolean {
  if (setting === "force") return true
  if (setting === "never") return false
  const mm =
    matchMedia ??
    (typeof window !== "undefined" ? window.matchMedia.bind(window) : undefined)
  if (!mm) return false
  return mm("(prefers-reduced-motion: reduce)").matches
}
