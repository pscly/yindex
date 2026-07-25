import { type CSSProperties, Children, type ReactNode } from "react"

export type PageTurnFadeLayers = {
  readonly outgoing: { readonly index: number; readonly opacity: number }
  readonly incoming: { readonly index: number; readonly opacity: number }
}

export function PageTurnStage(props: {
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
    transform: `translate3d(0, calc(${props.offsetY}% + ${props.parallaxY * 100}vh), 0)`,
    transition: "none",
    willChange: props.isAnimating ? "transform" : "auto",
  }
  const outgoingSlot = props.fadeLayers
    ? props.fadeLayers.outgoing.index + 1
    : null
  const incomingSlot = props.fadeLayers
    ? props.fadeLayers.incoming.index + 1
    : null
  return (
    <div style={stageStyle}>
      {Children.map(props.children, (child, slot) => {
        const role =
          slot === outgoingSlot
            ? "outgoing"
            : slot === incomingSlot
              ? "incoming"
              : null
        const layerStyle: CSSProperties = {
          height: `${100 / props.stripSlots}%`,
          width: "100%",
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
        return (
          <div
            style={layerStyle}
            data-page-turn-role={role ?? undefined}
            aria-hidden={props.fadeLayers && role === null ? true : undefined}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}
