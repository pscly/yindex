import {
  type CSSProperties,
  Children,
  type HTMLAttributes,
  type ReactNode,
} from "react"

export type PageTurnFadeLayers = {
  readonly outgoing: { readonly index: number; readonly opacity: number }
  readonly incoming: { readonly index: number; readonly opacity: number }
}

export function pageSlotFocusProps(
  isActive: boolean,
): Pick<HTMLAttributes<HTMLDivElement>, "aria-hidden" | "inert" | "tabIndex"> {
  if (isActive) return {}
  return { "aria-hidden": true, inert: true, tabIndex: -1 }
}

/**
 * Finite clone strip: translation is strip-only (offsetY%).
 * Immersive parallax is applied on a clipped per-Page inner layer so the
 * strip never leaves its paintable clone range.
 */
export function PageTurnStage(props: {
  readonly activeSlot: number
  readonly children?: ReactNode
  readonly fadeLayers: PageTurnFadeLayers | null
  readonly isAnimating: boolean
  readonly offsetY: number
  readonly parallaxY: number
  readonly stripSlots: number
}) {
  const stageStyle: CSSProperties = {
    height: `${props.stripSlots * 100}%`,
    width: "100%",
    transform: `translate3d(0, ${props.offsetY}%, 0)`,
    transition: "none",
    willChange: props.isAnimating ? "transform" : "auto",
  }
  const outgoingSlot = props.fadeLayers
    ? props.fadeLayers.outgoing.index + 1
    : null
  const incomingSlot = props.fadeLayers
    ? props.fadeLayers.incoming.index + 1
    : null
  const innerParallax =
    props.fadeLayers === null && props.parallaxY !== 0
      ? `translate3d(0, ${props.parallaxY * 100}vh, 0)`
      : "none"
  return (
    <div style={stageStyle}>
      {Children.map(props.children, (child, slot) => {
        const isActive = slot === props.activeSlot
        const role =
          slot === outgoingSlot
            ? "outgoing"
            : slot === incomingSlot
              ? "incoming"
              : null
        const layerStyle: CSSProperties = {
          height: `${100 / props.stripSlots}%`,
          width: "100%",
          overflow: "hidden",
          opacity:
            role === "outgoing"
              ? props.fadeLayers?.outgoing.opacity
              : role === "incoming"
                ? props.fadeLayers?.incoming.opacity
                : props.fadeLayers
                  ? 0
                  : 1,
          transform:
            role === "incoming" && outgoingSlot !== null
              ? `translate3d(0, ${(outgoingSlot - slot) * 100}%, 0)`
              : "none",
          pointerEvents: props.fadeLayers ? "none" : "auto",
          transition: "none",
          willChange: props.fadeLayers ? "transform, opacity" : "auto",
        }
        const contentStyle: CSSProperties = {
          height: "100%",
          width: "100%",
          transform: props.fadeLayers ? "none" : innerParallax,
          transition: "none",
          willChange: innerParallax !== "none" ? "transform" : "auto",
        }
        return (
          <div
            {...pageSlotFocusProps(isActive)}
            style={layerStyle}
            data-page-turn-role={role ?? undefined}
            data-page-slot-active={isActive ? "true" : "false"}
          >
            <div style={contentStyle} data-page-turn-parallax="inner">
              {child}
            </div>
          </div>
        )
      })}
    </div>
  )
}
