import type { CSSProperties, ReactNode } from "react"
import type { StyleTokens } from "@yindex/domain"

export type WidgetSurfaceProps = {
  readonly tokens: StyleTokens
  readonly title?: string
  readonly children: ReactNode
  readonly className?: string
  readonly style?: CSSProperties
}

export function WidgetSurface(props: WidgetSurfaceProps) {
  const { tokens, title, children, className, style } = props
  const glass = tokens.glass.enabled
  const surfaceStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    color: tokens.color.ink,
    background: tokens.color.surface,
    borderRadius: tokens.radius.md,
    border: `1px solid color-mix(in oklch, ${tokens.color.ink} 12%, transparent)`,
    fontFamily: tokens.typography.bodyFamily,
    fontSize: tokens.typography.bodySizePx,
    backdropFilter: glass ? `blur(${tokens.glass.blurPx}px)` : undefined,
    WebkitBackdropFilter: glass ? `blur(${tokens.glass.blurPx}px)` : undefined,
    boxShadow: glass
      ? `inset 0 1px 0 color-mix(in oklch, white ${tokens.glass.highlight * 100}%, transparent)`
      : tokens.elevation.mode === "tonal"
        ? `0 1px 0 color-mix(in oklch, ${tokens.color.ink} 8%, transparent)`
        : "none",
    ...style,
  }

  return (
    <section className={className} style={surfaceStyle} data-widget-surface="">
      {title ? (
        <header
          style={{
            padding: "8px 12px 0",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: tokens.color.muted,
            flex: "0 0 auto",
          }}
        >
          {title}
        </header>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, padding: 12 }}>{children}</div>
    </section>
  )
}
