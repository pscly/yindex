import { type StyleTokens, assertNever } from "@yindex/domain"
import type { CSSProperties, ReactNode } from "react"
import {
  buildBareSurfaceStyle,
  buildContentDirectSurfaceStyle,
  buildLensSurfaceStyle,
} from "./surfaceStyles"
import type { LensShape } from "./surfaceStyles"

export {
  buildBareSurfaceStyle,
  buildContentDirectSurfaceStyle,
  buildGlassTileStyle,
  buildLensSurfaceStyle,
  type LensShape,
  type LivingGlassCssProperties,
} from "./surfaceStyles"

export type WidgetSurfaceVariant =
  | { readonly kind: "lens"; readonly shape: LensShape }
  | { readonly kind: "content-direct" }
  | { readonly kind: "bare" }

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

export type BareSurfaceProps = SurfaceShellProps

export type WidgetSurfaceProps = SurfaceShellProps & {
  readonly variant: WidgetSurfaceVariant
}

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
            lineHeight: 1.2,
            letterSpacing: "0.1em",
            color:
              "var(--yindex-lens-muted-ink, var(--yindex-content-direct-muted-ink, inherit))",
            flex: "0 0 auto",
            fontWeight: 500,
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
          minWidth: 0,
          overflow: "hidden",
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

export function BareSurface(props: BareSurfaceProps) {
  const showTitle = props.showTitle !== false && Boolean(props.title)
  const surfaceStyle: CSSProperties = {
    ...buildBareSurfaceStyle(props.tokens),
    ...props.style,
  }
  return (
    <SurfaceFrame
      surfaceStyle={surfaceStyle}
      title={props.title}
      showTitle={showTitle}
      className={props.className}
      dataAttrs={{
        "data-widget-surface": "bare",
      }}
    >
      {props.children}
    </SurfaceFrame>
  )
}

export function WidgetSurface(props: WidgetSurfaceProps) {
  const { variant, ...surfaceProps } = props
  switch (variant.kind) {
    case "lens":
      return <LensSurface {...surfaceProps} shape={variant.shape} />
    case "content-direct":
      return <ContentDirectSurface {...surfaceProps} />
    case "bare":
      return <BareSurface {...surfaceProps} />
    default:
      return assertNever(variant)
  }
}
