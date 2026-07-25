import { EDITOR_GRAPHITE } from "@yindex/style-packs"
import type { CSSProperties } from "react"

export const panel: CSSProperties = {
  position: "fixed",
  right: 20,
  bottom: 84,
  width: 312,
  maxHeight: "min(72vh, 620px)",
  overflow: "auto",
  zIndex: 3200,
  borderRadius: 16,
  padding: 16,
  background: `color-mix(in oklch, ${EDITOR_GRAPHITE.color.bg} 92%, transparent)`,
  color: EDITOR_GRAPHITE.color.ink,
  border: "1px solid color-mix(in oklch, white 11%, transparent)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  boxShadow: "0 18px 50px color-mix(in oklch, black 42%, transparent)",
  fontSize: 13,
}

export const ghostBtn: CSSProperties = {
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  background: "color-mix(in oklch, white 5%, transparent)",
  color: "inherit",
  borderRadius: 10,
  padding: "7px 11px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
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
}

export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.06em",
  opacity: 0.75,
  fontWeight: 600,
}

export const rowCheck: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12.5,
}
