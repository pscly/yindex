import { EDITOR_GRAPHITE } from "@yindex/style-packs"
import type { CSSProperties } from "react"

export const ACCENT_FILL_MAX_PCT = 8 as const
export const PANEL_OPEN_MS = 200 as const
export const PANEL_OPEN_REDUCED_MS = 120 as const
export const PRESS_SCALE = 0.97 as const
export const PRESS_MS = 120 as const
export const chromeFontFamily =
  '"Noto Sans SC Variable", "Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif' as const

export type ChromeSurfaceOpts = {
  readonly pageAccent?: string | undefined
  readonly reducedMotion?: boolean | undefined
}
export type ChromeStyleOptions = ChromeSurfaceOpts
export type ChromeAccentOpts = { readonly pageAccent?: string | undefined }

type ChromeStyleVars = CSSProperties & {
  readonly "--chrome-accent": string
  readonly "--chrome-panel-open-ms": string
  readonly "--chrome-press-ms": string
  readonly "--chrome-press-scale": number
}

export function chromeStyleVars(
  pageAccent?: string,
  reducedMotion = false,
): ChromeStyleVars {
  return {
    "--chrome-accent": pageAccent ?? EDITOR_GRAPHITE.color.accent,
    "--chrome-panel-open-ms": `${reducedMotion ? PANEL_OPEN_REDUCED_MS : PANEL_OPEN_MS}ms`,
    "--chrome-press-ms": `${PRESS_MS}ms`,
    "--chrome-press-scale": PRESS_SCALE,
    fontFamily: chromeFontFamily,
  }
}

export function borrowAccentFill(
  pageAccent: string | undefined,
  pct: number = ACCENT_FILL_MAX_PCT,
): string {
  const graphite = EDITOR_GRAPHITE.color.bg
  if (!pageAccent) return `color-mix(in oklch, ${graphite} 92%, transparent)`
  const borrow = Math.min(Math.max(pct, 0), ACCENT_FILL_MAX_PCT)
  return `color-mix(in oklch, color-mix(in oklch, ${graphite} ${100 - borrow}%, ${pageAccent} ${borrow}%) 92%, transparent)`
}

function panelAnimation(reducedMotion = false): string {
  const name = reducedMotion
    ? "yindex-chrome-panel-fade"
    : "yindex-chrome-panel-open"
  const duration = reducedMotion ? PANEL_OPEN_REDUCED_MS : PANEL_OPEN_MS
  return `${name} ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1) both`
}

export function editPanelStyle(opts: ChromeSurfaceOpts = {}): CSSProperties {
  return {
    ...chromeStyleVars(opts.pageAccent, opts.reducedMotion),
    position: "fixed",
    right: 20,
    bottom: 84,
    width: 312,
    maxHeight: "min(72vh, 620px)",
    overflow: "auto",
    zIndex: 3200,
    borderRadius: 16,
    padding: 16,
    background: borrowAccentFill(opts.pageAccent),
    color: EDITOR_GRAPHITE.color.ink,
    border: "1px solid color-mix(in oklch, white 11%, transparent)",
    backdropFilter: "blur(18px) saturate(1.15)",
    WebkitBackdropFilter: "blur(18px) saturate(1.15)",
    boxShadow: "0 18px 50px color-mix(in oklch, black 42%, transparent)",
    fontSize: 13,
    animation: panelAnimation(opts.reducedMotion),
  }
}
export const panelStyle = editPanelStyle

export function fabDockStyle(opts: ChromeSurfaceOpts = {}): CSSProperties {
  return {
    ...chromeStyleVars(opts.pageAccent, opts.reducedMotion),
    position: "fixed",
    right: 20,
    bottom: 20,
    display: "flex",
    alignItems: "center",
    gap: 8,
    zIndex: 3100,
    padding: "8px 10px",
    borderRadius: 999,
    background: borrowAccentFill(opts.pageAccent, 6),
    color: EDITOR_GRAPHITE.color.ink,
    border: "1px solid color-mix(in oklch, white 12%, transparent)",
    backdropFilter: "blur(16px) saturate(1.2)",
    WebkitBackdropFilter: "blur(16px) saturate(1.2)",
    boxShadow: "0 12px 40px color-mix(in oklch, black 35%, transparent)",
  }
}
export const dockStyle = fabDockStyle

export function settingsOverlayStyle(
  opts: ChromeSurfaceOpts = {},
): CSSProperties {
  return {
    ...chromeStyleVars(opts.pageAccent, opts.reducedMotion),
    position: "fixed",
    inset: 0,
    zIndex: 4000,
    background: "color-mix(in oklch, black 52%, transparent)",
    display: "grid",
    placeItems: "center",
    padding: 24,
    backdropFilter: "blur(6px)",
  }
}

export function settingsSheetStyle(
  opts: ChromeSurfaceOpts = {},
): CSSProperties {
  return {
    ...chromeStyleVars(opts.pageAccent, opts.reducedMotion),
    width: "min(460px, 100%)",
    maxHeight: "min(82vh, 740px)",
    overflow: "auto",
    borderRadius: 18,
    padding: "22px 22px 26px",
    background: borrowAccentFill(opts.pageAccent),
    color: EDITOR_GRAPHITE.color.ink,
    border: "1px solid color-mix(in oklch, white 10%, transparent)",
    boxShadow: "0 28px 80px color-mix(in oklch, black 48%, transparent)",
    backdropFilter: "blur(18px) saturate(1.15)",
    WebkitBackdropFilter: "blur(18px) saturate(1.15)",
    animation: panelAnimation(opts.reducedMotion),
  }
}

export function accentActionStyle(opts: ChromeAccentOpts = {}): CSSProperties {
  const accent = opts.pageAccent ?? EDITOR_GRAPHITE.color.accent
  return {
    background: borrowAccentFill(accent),
    borderColor: `color-mix(in oklch, ${accent} 46%, ${EDITOR_GRAPHITE.color.line})`,
    color: EDITOR_GRAPHITE.color.ink,
    fontWeight: 600,
    boxShadow: `0 6px 20px color-mix(in oklch, ${accent} 18%, transparent)`,
  }
}

export function fabIdlePrimaryStyle(): CSSProperties {
  return {
    background: `color-mix(in oklch, ${EDITOR_GRAPHITE.color.surface} 92%, transparent)`,
    boxShadow: "0 8px 24px color-mix(in oklch, black 28%, transparent)",
  }
}

export const ghostBtn: CSSProperties = {
  border: `1px solid ${EDITOR_GRAPHITE.color.line}`,
  background: `color-mix(in oklch, ${EDITOR_GRAPHITE.color.surface} 94%, white 6%)`,
  color: "inherit",
  borderRadius: 10,
  padding: "7px 11px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: chromeFontFamily,
}

export const inputStyle: CSSProperties = {
  width: "100%",
  marginTop: 5,
  borderRadius: 10,
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  background: "color-mix(in oklch, black 28%, transparent)",
  color: "inherit",
  padding: "9px 11px",
  boxSizing: "border-box",
  fontFamily: chromeFontFamily,
}

export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.06em",
  opacity: 0.75,
  fontWeight: 600,
  fontFamily: chromeFontFamily,
}

export const rowCheck: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12.5,
  fontFamily: chromeFontFamily,
}

export const section: CSSProperties = {
  marginTop: 20,
  paddingTop: 16,
  borderTop: "1px solid color-mix(in oklch, white 8%, transparent)",
}

export const h3: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.72,
  fontFamily: chromeFontFamily,
}

export const row: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  marginBottom: 10,
  fontSize: 13.5,
  lineHeight: 1.45,
  fontFamily: chromeFontFamily,
}

export const selectStyle: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  background: "color-mix(in oklch, black 28%, transparent)",
  color: "inherit",
  padding: "10px 12px",
  fontSize: 13,
  fontFamily: chromeFontFamily,
}

export const iconBtn: CSSProperties = {
  ...ghostBtn,
  width: 36,
  height: 36,
  borderRadius: 999,
  color: EDITOR_GRAPHITE.color.ink,
  display: "grid",
  placeItems: "center",
  padding: 0,
}

export const primaryBtn: CSSProperties = {
  ...ghostBtn,
  height: 36,
  minWidth: 64,
  borderRadius: 999,
  color: "oklch(0.98 0.01 80)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.02em",
  padding: "0 16px",
}

export const divider: CSSProperties = {
  width: 1,
  height: 18,
  background: "color-mix(in oklch, white 14%, transparent)",
  margin: "0 2px",
}
