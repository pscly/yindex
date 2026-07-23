import type { CSSProperties } from "react"

export const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 4000,
  background: "color-mix(in oklch, black 45%, transparent)",
  display: "grid",
  placeItems: "center",
  padding: 24,
}

export const sheet: CSSProperties = {
  width: "min(480px, 100%)",
  maxHeight: "min(80vh, 720px)",
  overflow: "auto",
  borderRadius: 16,
  padding: 20,
  background: "oklch(0.22 0.01 260)",
  color: "oklch(0.94 0.01 260)",
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  boxShadow: "0 20px 60px color-mix(in oklch, black 40%, transparent)",
}

export const section: CSSProperties = { marginTop: 18 }
export const h3: CSSProperties = { margin: "0 0 8px", fontSize: 14, fontWeight: 600 }
export const row: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  marginBottom: 8,
  fontSize: 13,
  lineHeight: 1.4,
}
export const ghostBtn: CSSProperties = {
  border: "1px solid color-mix(in oklch, white 14%, transparent)",
  background: "color-mix(in oklch, white 6%, transparent)",
  color: "inherit",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
}
export const selectStyle: CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid color-mix(in oklch, white 14%, transparent)",
  background: "color-mix(in oklch, black 25%, transparent)",
  color: "inherit",
  padding: "8px 10px",
}
