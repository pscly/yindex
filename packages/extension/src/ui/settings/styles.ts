import type { CSSProperties } from "react"

export const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 4000,
  background: "color-mix(in oklch, black 52%, transparent)",
  display: "grid",
  placeItems: "center",
  padding: 24,
  backdropFilter: "blur(6px)",
}

export const sheet: CSSProperties = {
  width: "min(460px, 100%)",
  maxHeight: "min(82vh, 740px)",
  overflow: "auto",
  borderRadius: 18,
  padding: "22px 22px 26px",
  background: "oklch(0.18 0.01 260)",
  color: "oklch(0.94 0.01 260)",
  border: "1px solid color-mix(in oklch, white 10%, transparent)",
  boxShadow: "0 28px 80px color-mix(in oklch, black 48%, transparent)",
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
}

export const row: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  marginBottom: 10,
  fontSize: 13.5,
  lineHeight: 1.45,
}

export const ghostBtn: CSSProperties = {
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  background: "color-mix(in oklch, white 5%, transparent)",
  color: "inherit",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 12.5,
  fontWeight: 500,
}

export const selectStyle: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  background: "color-mix(in oklch, black 28%, transparent)",
  color: "inherit",
  padding: "10px 12px",
  fontSize: 13,
}
