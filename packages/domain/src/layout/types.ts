export type RectPct = {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export type LayoutRect = RectPct & {
  readonly z: number
}

export type SnapGuideKind =
  | "safe"
  | "grid"
  | "thirds"
  | "golden"
  | "widget-edge"
  | "widget-center"

export type SnapGuide = {
  readonly kind: SnapGuideKind
  readonly axis: "x" | "y"
  readonly value: number
}

export type LayoutConstraints = {
  readonly safePct: number
  readonly minW: number
  readonly minH: number
  readonly snapThresholdPct: number
  readonly gridDivisions: number
}

export const DEFAULT_LAYOUT_CONSTRAINTS = {
  safePct: 2,
  minW: 8,
  minH: 8,
  snapThresholdPct: 0.8,
  gridDivisions: 12,
} as const satisfies LayoutConstraints
