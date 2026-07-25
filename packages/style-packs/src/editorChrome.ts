export type EditorChromeData = {
  readonly color: {
    readonly bg: string
    readonly surface: string
    readonly ink: string
    readonly muted: string
    readonly line: string
    readonly accent: string
  }
}

/** Stable graphite host data; not a Page Style Pack. */
export const EDITOR_GRAPHITE = {
  color: {
    bg: "oklch(0.16 0.008 260)",
    surface: "oklch(0.22 0.01 260)",
    ink: "oklch(0.94 0.01 260)",
    muted: "oklch(0.72 0.02 260)",
    line: "oklch(0.35 0.015 260)",
    accent: "oklch(0.62 0.14 36)",
  },
} as const satisfies EditorChromeData
