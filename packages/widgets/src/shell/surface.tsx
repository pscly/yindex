import type { StyleTokens } from "@yindex/domain"
import type { CSSProperties, ReactNode } from "react"

export type LensShape = "panel" | "capsule" | "shelf"

export type LivingGlassCssProperties = CSSProperties & {
  readonly "--yindex-lens-ink"?: string
  readonly "--yindex-lens-muted-ink"?: string
  readonly "--yindex-content-direct-ink"?: string
  readonly "--yindex-content-direct-muted-ink"?: string
  readonly "--yindex-glass-tint"?: string
  readonly "--yindex-glass-tint-opacity"?: number
  readonly "--yindex-glass-scrim"?: string
  readonly "--yindex-glass-scrim-opacity"?: number
  readonly "--yindex-content-direct-scrim"?: string
  readonly "--yindex-content-direct-scrim-opacity"?: number
  readonly "--yindex-glass-blur"?: string
  readonly "--yindex-glass-opacity"?: number
  readonly "--yindex-glass-saturation"?: number
  readonly "--yindex-glass-highlight"?: number
}

const LENS_BRIGHTNESS = 1.06
const FLOAT_SHADOW = "0 16px 36px color-mix(in oklch, black 22%, transparent)"

function lensRadius(tokens: StyleTokens, shape: LensShape): string {
  return shape === "capsule" ? "999px" : tokens.radius.md
}

function baseChrome(tokens: StyleTokens): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    fontFamily: tokens.typography.bodyFamily,
    fontSize: tokens.typography.bodySizePx,
  }
}

export function buildLensSurfaceStyle(
  tokens: StyleTokens,
  shape: LensShape,
): LivingGlassCssProperties {
  const { lens } = tokens.glass.adaptive
  const highlightPct = Math.round(
    Math.min(0.45, Math.max(0.25, tokens.glass.highlight)) * 100,
  )
  const edgePct = Math.round(8 + tokens.glass.highlight * 10)
  const glassOn = tokens.glass.enabled
  const backdrop = glassOn
    ? `blur(${tokens.glass.blurPx}px) saturate(var(--yindex-glass-saturation, 1)) brightness(${LENS_BRIGHTNESS})`
    : undefined

  return {
    ...baseChrome(tokens),
    color: lens.foreground,
    background: glassOn ? lens.tint : tokens.color.surface,
    borderRadius: lensRadius(tokens, shape),
    border: glassOn
      ? `1px solid color-mix(in oklch, white ${edgePct}%, transparent)`
      : `1px solid color-mix(in oklch, ${tokens.color.ink} 10%, transparent)`,
    backdropFilter: backdrop,
    WebkitBackdropFilter: backdrop,
    boxShadow: glassOn
      ? `inset 0 1px 0 color-mix(in oklch, white ${highlightPct}%, transparent), ${FLOAT_SHADOW}`
      : tokens.elevation.mode === "tonal"
        ? `0 1px 0 color-mix(in oklch, ${tokens.color.ink} 6%, transparent), 0 10px 28px color-mix(in oklch, black 10%, transparent)`
        : tokens.elevation.mode === "flat"
          ? `0 1px 0 color-mix(in oklch, ${tokens.color.ink} 5%, transparent)`
          : "none",
    "--yindex-lens-ink": lens.foreground,
    "--yindex-lens-muted-ink": lens.mutedForeground,
    "--yindex-glass-tint": lens.tint,
    "--yindex-glass-tint-opacity": lens.tintOpacity,
    "--yindex-glass-scrim": lens.scrim,
    "--yindex-glass-scrim-opacity": lens.scrimOpacity,
    "--yindex-glass-blur": `${tokens.glass.blurPx}px`,
    "--yindex-glass-opacity": tokens.glass.opacity,
    "--yindex-glass-saturation": tokens.glass.saturation,
    "--yindex-glass-highlight": tokens.glass.highlight,
  }
}

export function buildContentDirectSurfaceStyle(
  tokens: StyleTokens,
): LivingGlassCssProperties {
  const { contentDirect } = tokens.glass.adaptive
  return {
    ...baseChrome(tokens),
    color: contentDirect.foreground,
    background: "transparent",
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    backdropFilter: undefined,
    WebkitBackdropFilter: undefined,
    "--yindex-content-direct-ink": contentDirect.foreground,
    "--yindex-content-direct-muted-ink": contentDirect.mutedForeground,
    "--yindex-content-direct-scrim": contentDirect.scrim,
    "--yindex-content-direct-scrim-opacity": contentDirect.scrimOpacity,
  }
}

type SurfaceShellProps = {
  readonly tokens: StyleTokens
  readonly title?: string | undefined
  readonly showTitle?: boolean | undefined
  readonly children: ReactNode
  readonly className?: string | undefined
  readonly style?: CSSProperties | undefined
}

export type LensSurfaceProps = SurfaceShellProps & {
  readonly shape?: LensShape | undefined
}

export type ContentDirectSurfaceProps = SurfaceShellProps

export type WidgetSurfaceProps = SurfaceShellProps

function SurfaceFrame(props: {
  readonly surfaceStyle: CSSProperties
  readonly title?: string | undefined
  readonly showTitle: boolean
  readonly children: ReactNode
  readonly className?: string | undefined
  readonly dataAttrs: Record<string, string>
}) {
  return (
    <section
      className={props.className}
      style={props.surfaceStyle}
      {...props.dataAttrs}
    >
      {props.showTitle ? (
        <header
          style={{
            position: "relative",
            zIndex: 2,
            padding: "10px 16px 0",
            fontSize: 11,
            letterSpacing: "0.1em",
            color:
              "var(--yindex-lens-muted-ink, var(--yindex-content-direct-muted-ink, inherit))",
            flex: "0 0 auto",
            fontWeight: 500,
            opacity: 0.85,
          }}
        >
          {props.title}
        </header>
      ) : null}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          minHeight: 0,
          padding: props.showTitle ? "10px 16px 16px" : 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {props.children}
      </div>
    </section>
  )
}

export function LensSurface(props: LensSurfaceProps) {
  const shape = props.shape ?? "panel"
  const showTitle = props.showTitle !== false && Boolean(props.title)
  const surfaceStyle: CSSProperties = {
    ...buildLensSurfaceStyle(props.tokens, shape),
    ...props.style,
  }
  return (
    <SurfaceFrame
      surfaceStyle={surfaceStyle}
      title={props.title}
      showTitle={showTitle}
      className={props.className}
      dataAttrs={{
        "data-widget-surface": "lens",
        "data-lens-shape": shape,
      }}
    >
      {props.children}
    </SurfaceFrame>
  )
}

export function ContentDirectSurface(props: ContentDirectSurfaceProps) {
  const showTitle = props.showTitle !== false && Boolean(props.title)
  const surfaceStyle: CSSProperties = {
    ...buildContentDirectSurfaceStyle(props.tokens),
    ...props.style,
  }
  return (
    <SurfaceFrame
      surfaceStyle={surfaceStyle}
      title={props.title}
      showTitle={showTitle}
      className={props.className}
      dataAttrs={{
        "data-widget-surface": "content-direct",
      }}
    >
      {props.children}
    </SurfaceFrame>
  )
}

export function WidgetSurface(props: WidgetSurfaceProps) {
  return <LensSurface {...props} shape="panel" />
}
