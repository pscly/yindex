import type { CSSProperties, ReactNode } from "react"
import type { StyleTokens } from "@yindex/domain"

export type WidgetSurfaceProps = {
  readonly tokens: StyleTokens
  readonly title?: string
  /** When false, title is hidden even if `title` string is provided */
  readonly showTitle?: boolean | undefined
  readonly children: ReactNode
  readonly className?: string
  readonly style?: CSSProperties
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
      ? `color-mix(in oklch, ${tokens.color.surface} ${Math.round(tokens.glass.opacity * 100)}%, transparent)`
      : tokens.color.surface,
    borderRadius: tokens.radius.md,
    border: `1px solid color-mix(in oklch, ${tokens.color.ink} 12%, transparent)`,
    fontFamily: tokens.typography.bodyFamily,
    fontSize: tokens.typography.bodySizePx,
    backdropFilter: glass ? `blur(${tokens.glass.blurPx}px)` : undefined,
    WebkitBackdropFilter: glass ? `blur(${tokens.glass.blurPx}px)` : undefined,
    boxShadow: glass
      ? `inset 0 1px 0 color-mix(in oklch, white ${tokens.glass.highlight * 100}%, transparent), 0 8px 28px color-mix(in oklch, black 22%, transparent)`
      : tokens.elevation.mode === "tonal"
        ? `0 1px 0 color-mix(in oklch, ${tokens.color.ink} 8%, transparent), 0 6px 20px color-mix(in oklch, black 12%, transparent)`
        : "none",
    ...style,
  }

  return (
    <section className={className} style={surfaceStyle} data-widget-surface="">
      {showTitle ? (
        <header
          style={{
            padding: "10px 14px 0",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "none",
            color: tokens.color.muted,
            flex: "0 0 auto",
            fontWeight: 500,
            opacity: 0.9,
          }}
        >
          {title}
        </header>
      ) : null}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: showTitle ? "8px 14px 14px" : 14,
        }}
      >
        {children}
      </div>
    </section>
  )
}
