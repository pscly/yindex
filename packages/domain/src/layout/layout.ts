import { err, ok, type Result } from "../result/result"
import {
  DEFAULT_LAYOUT_CONSTRAINTS,
  type LayoutConstraints,
  type LayoutRect,
  type RectPct,
  type SnapGuide,
} from "./types"

export type LayoutError =
  | { readonly code: "out_of_bounds"; readonly message: string }
  | { readonly code: "too_small"; readonly message: string }
  | { readonly code: "invalid"; readonly message: string }

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function clampRect(
  rect: RectPct,
  constraints: LayoutConstraints = DEFAULT_LAYOUT_CONSTRAINTS,
): RectPct {
  const safe = constraints.safePct
  const maxX = 100 - safe
  const maxY = 100 - safe
  const minX = safe
  const minY = safe

  let w = clamp(rect.w, constraints.minW, maxX - minX)
  let h = clamp(rect.h, constraints.minH, maxY - minY)
  let x = clamp(rect.x, minX, maxX - w)
  let y = clamp(rect.y, minY, maxY - h)

  // Re-clamp size if position forced us near edge
  if (x + w > maxX) w = maxX - x
  if (y + h > maxY) h = maxY - y
  w = Math.max(w, constraints.minW)
  h = Math.max(h, constraints.minH)
  x = clamp(x, minX, maxX - w)
  y = clamp(y, minY, maxY - h)

  return { x, y, w, h }
}

export function validateRect(
  rect: RectPct,
  constraints: LayoutConstraints = DEFAULT_LAYOUT_CONSTRAINTS,
): Result<RectPct, LayoutError> {
  if (
    ![rect.x, rect.y, rect.w, rect.h].every(
      (n) => typeof n === "number" && Number.isFinite(n),
    )
  ) {
    return err({ code: "invalid", message: "rect values must be finite numbers" })
  }
  if (rect.w < constraints.minW || rect.h < constraints.minH) {
    return err({
      code: "too_small",
      message: `min size is ${constraints.minW}×${constraints.minH}%`,
    })
  }
  const safe = constraints.safePct
  if (
    rect.x < safe ||
    rect.y < safe ||
    rect.x + rect.w > 100 - safe ||
    rect.y + rect.h > 100 - safe
  ) {
    return err({
      code: "out_of_bounds",
      message: `rect must stay within safe margin ${safe}%`,
    })
  }
  return ok(rect)
}

export function withZ(rect: RectPct, z: number): LayoutRect {
  return { ...rect, z }
}

export function buildSnapGuides(
  others: readonly LayoutRect[],
  constraints: LayoutConstraints = DEFAULT_LAYOUT_CONSTRAINTS,
): readonly SnapGuide[] {
  const guides: SnapGuide[] = []
  const safe = constraints.safePct

  // Safe margins
  for (const v of [safe, 100 - safe]) {
    guides.push({ kind: "safe", axis: "x", value: v })
    guides.push({ kind: "safe", axis: "y", value: v })
  }

  // Grid
  const step = 100 / constraints.gridDivisions
  for (let i = 1; i < constraints.gridDivisions; i++) {
    const v = i * step
    guides.push({ kind: "grid", axis: "x", value: v })
    guides.push({ kind: "grid", axis: "y", value: v })
  }

  // Thirds
  for (const v of [100 / 3, (200) / 3]) {
    guides.push({ kind: "thirds", axis: "x", value: v })
    guides.push({ kind: "thirds", axis: "y", value: v })
  }

  // Golden ratio lines
  const phi = 1 / 1.6180339887
  for (const v of [100 * phi, 100 * (1 - phi)]) {
    guides.push({ kind: "golden", axis: "x", value: v })
    guides.push({ kind: "golden", axis: "y", value: v })
  }

  // Other widgets
  for (const o of others) {
    for (const v of [o.x, o.x + o.w / 2, o.x + o.w]) {
      guides.push({
        kind: v === o.x + o.w / 2 ? "widget-center" : "widget-edge",
        axis: "x",
        value: v,
      })
    }
    for (const v of [o.y, o.y + o.h / 2, o.y + o.h]) {
      guides.push({
        kind: v === o.y + o.h / 2 ? "widget-center" : "widget-edge",
        axis: "y",
        value: v,
      })
    }
  }

  return guides
}

type SnapCandidate = { readonly value: number; readonly guide: SnapGuide }

function nearest(
  value: number,
  guides: readonly SnapGuide[],
  axis: "x" | "y",
  threshold: number,
): SnapCandidate | null {
  let best: SnapCandidate | null = null
  let bestDist = threshold
  for (const g of guides) {
    if (g.axis !== axis) continue
    const d = Math.abs(g.value - value)
    if (d <= bestDist) {
      bestDist = d
      best = { value: g.value, guide: g }
    }
  }
  return best
}

export type SnapResult = {
  readonly rect: RectPct
  readonly activeGuides: readonly SnapGuide[]
}

/**
 * Snap a moving rect to guides. Matches left/center/right and top/mid/bottom edges.
 * When snapEnabled is false, returns rect unchanged.
 */
export function snapRect(
  rect: RectPct,
  guides: readonly SnapGuide[],
  options: {
    readonly enabled: boolean
    readonly constraints?: LayoutConstraints
  },
): SnapResult {
  if (!options.enabled) {
    return { rect, activeGuides: [] }
  }
  const constraints = options.constraints ?? DEFAULT_LAYOUT_CONSTRAINTS
  const thr = constraints.snapThresholdPct
  const active: SnapGuide[] = []

  let { x, y, w, h } = rect
  const left = x
  const cx = x + w / 2
  const right = x + w
  const top = y
  const cy = y + h / 2
  const bottom = y + h

  const snapL = nearest(left, guides, "x", thr)
  const snapC = nearest(cx, guides, "x", thr)
  const snapR = nearest(right, guides, "x", thr)

  // Prefer edge snaps over center when distances equal (nearest already does)
  if (snapL && (!snapC || Math.abs(snapL.value - left) <= Math.abs(snapC.value - cx))) {
    if (!snapR || Math.abs(snapL.value - left) <= Math.abs(snapR.value - right)) {
      x = snapL.value
      active.push(snapL.guide)
    } else if (snapR) {
      x = snapR.value - w
      active.push(snapR.guide)
    }
  } else if (snapR && (!snapC || Math.abs(snapR.value - right) <= Math.abs(snapC.value - cx))) {
    x = snapR.value - w
    active.push(snapR.guide)
  } else if (snapC) {
    x = snapC.value - w / 2
    active.push(snapC.guide)
  }

  const snapT = nearest(top, guides, "y", thr)
  const snapM = nearest(cy, guides, "y", thr)
  const snapB = nearest(bottom, guides, "y", thr)

  if (snapT && (!snapM || Math.abs(snapT.value - top) <= Math.abs(snapM.value - cy))) {
    if (!snapB || Math.abs(snapT.value - top) <= Math.abs(snapB.value - bottom)) {
      y = snapT.value
      active.push(snapT.guide)
    } else if (snapB) {
      y = snapB.value - h
      active.push(snapB.guide)
    }
  } else if (snapB && (!snapM || Math.abs(snapB.value - bottom) <= Math.abs(snapM.value - cy))) {
    y = snapB.value - h
    active.push(snapB.guide)
  } else if (snapM) {
    y = snapM.value - h / 2
    active.push(snapM.guide)
  }

  const clamped = clampRect({ x, y, w, h }, constraints)
  return { rect: clamped, activeGuides: active }
}

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
    return distribute(rects, alignment === "distribute-x" ? "x" : "y", constraints)
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
  const sorted = [...rects].sort((a, b) => (axis === "x" ? a.x - b.x : a.y - b.y))
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
