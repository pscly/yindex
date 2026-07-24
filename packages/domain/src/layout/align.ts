import { clampRect } from "./layout"
import type { LayoutConstraints, LayoutRect, RectPct } from "./types"
import { DEFAULT_LAYOUT_CONSTRAINTS } from "./types"

export function alignRects(
  rects: readonly LayoutRect[],
  alignment:
    | "left"
    | "center-x"
    | "right"
    | "top"
    | "center-y"
    | "bottom"
    | "distribute-x"
    | "distribute-y",
  constraints: LayoutConstraints = DEFAULT_LAYOUT_CONSTRAINTS,
): readonly LayoutRect[] {
  if (rects.length === 0) return []
  if (alignment === "distribute-x" || alignment === "distribute-y") {
    return distribute(
      rects,
      alignment === "distribute-x" ? "x" : "y",
      constraints,
    )
  }

  const xs = rects.map((r) => r.x)
  const ys = rects.map((r) => r.y)
  const rights = rects.map((r) => r.x + r.w)
  const bottoms = rects.map((r) => r.y + r.h)
  const minX = Math.min(...xs)
  const maxRight = Math.max(...rights)
  const minY = Math.min(...ys)
  const maxBottom = Math.max(...bottoms)
  const centerX = (minX + maxRight) / 2
  const centerY = (minY + maxBottom) / 2

  return rects.map((r) => {
    let next: RectPct = { x: r.x, y: r.y, w: r.w, h: r.h }
    switch (alignment) {
      case "left":
        next = { ...next, x: minX }
        break
      case "right":
        next = { ...next, x: maxRight - r.w }
        break
      case "center-x":
        next = { ...next, x: centerX - r.w / 2 }
        break
      case "top":
        next = { ...next, y: minY }
        break
      case "bottom":
        next = { ...next, y: maxBottom - r.h }
        break
      case "center-y":
        next = { ...next, y: centerY - r.h / 2 }
        break
    }
    const clamped = clampRect(next, constraints)
    return { ...clamped, z: r.z }
  })
}

function distribute(
  rects: readonly LayoutRect[],
  axis: "x" | "y",
  constraints: LayoutConstraints,
): readonly LayoutRect[] {
  if (rects.length < 3) return rects
  const sorted = [...rects].sort((a, b) =>
    axis === "x" ? a.x - b.x : a.y - b.y,
  )
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (!first || !last) return rects

  if (axis === "x") {
    const start = first.x
    const end = last.x + last.w
    const totalSize = sorted.reduce((s, r) => s + r.w, 0)
    const gap = (end - start - totalSize) / (sorted.length - 1)
    let cursor = start
    return sorted.map((r) => {
      const next = clampRect({ x: cursor, y: r.y, w: r.w, h: r.h }, constraints)
      cursor += r.w + gap
      return { ...next, z: r.z }
    })
  }

  const start = first.y
  const end = last.y + last.h
  const totalSize = sorted.reduce((s, r) => s + r.h, 0)
  const gap = (end - start - totalSize) / (sorted.length - 1)
  let cursor = start
  return sorted.map((r) => {
    const next = clampRect({ x: r.x, y: cursor, w: r.w, h: r.h }, constraints)
    cursor += r.h + gap
    return { ...next, z: r.z }
  })
}
