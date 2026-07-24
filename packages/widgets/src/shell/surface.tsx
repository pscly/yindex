import type { CSSProperties, ReactNode } from "react"
import type { StyleTokens } from "@yindex/domain"

export type WidgetSurfaceProps = {
  readonly tokens: StyleTokens
  readonly title?: string | undefined
  readonly showTitle?: boolean | undefined
  readonly children: ReactNode
  readonly className?: string | undefined
  readonly style?: CSSProperties | undefined
}

export function WidgetSurface(props: WidgetSurfaceProps) {
  const { tokens, title, children, className, style } = props
  const showTitle = props.showTitle !== false && Boolean(title)
  const glass = tokens.glass.enabled
  const surfaceStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    color: tokens.color.ink,
    background: glass
      ? `color-mix(in oklch, ${tokens.color.surface} ${Math.round(Math.max(tokens.glass.opacity, 0.35) * 100)}%, transparent)`
      : tokens.color.surface,
    borderRadius: tokens.radius.md,
    border: glass
      ? `1px solid color-mix(in oklch, white ${12 + tokens.glass.highlight * 20}%, transparent)`
      : `1px solid color-mix(in oklch, ${tokens.color.ink} 10%, transparent)`,
    fontFamily: tokens.typography.bodyFamily,
    fontSize: tokens.typography.bodySizePx,
    backdropFilter: glass ? `blur(${tokens.glass.blurPx}px) saturate(1.15)` : undefined,
    WebkitBackdropFilter: glass
      ? `blur(${tokens.glass.blurPx}px) saturate(1.15)`
      : undefined,
    boxShadow: glass
      ? `inset 0 1px 0 color-mix(in oklch, white ${tokens.glass.highlight * 100}%, transparent), 0 12px 36px color-mix(in oklch, black 28%, transparent)`
      : tokens.elevation.mode === "tonal"
        ? `0 1px 0 color-mix(in oklch, ${tokens.color.ink} 6%, transparent), 0 10px 28px color-mix(in oklch, black 10%, transparent)`
        : tokens.elevation.mode === "flat"
          ? `0 1px 0 color-mix(in oklch, ${tokens.color.ink} 5%, transparent)`
          : "none",
    ...style,
  }

  return (
    <section className={className} style={surfaceStyle} data-widget-surface="">
      {showTitle ? (
        <header
          style={{
            padding: "10px 16px 0",
            fontSize: 11,
            letterSpacing: "0.1em",
            color: tokens.color.muted,
            flex: "0 0 auto",
            fontWeight: 500,
            opacity: 0.85,
          }}
        >
          {title}
        </header>
      ) : null}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: showTitle ? "10px 16px 16px" : 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </section>
  )
}
