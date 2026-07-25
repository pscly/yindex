import type { WidgetInstanceId } from "@yindex/domain"
import type { ReactNode } from "react"

export type LayoutDraftEvent = {
  readonly widgetId: WidgetInstanceId
  readonly rect: { x: number; y: number; w: number; h: number }
  readonly altKey: boolean
}

type EditDragShellProps = {
  readonly widgetId: WidgetInstanceId
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly children: ReactNode
  readonly onDraft?: (event: LayoutDraftEvent) => void
}

export function EditDragShell(props: EditDragShellProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        cursor: "move",
      }}
      onPointerDown={(e) => {
        if (!props.onDraft) return
        if (
          e.target instanceof Element &&
          e.target.getAttribute("data-resize-handle") === "true"
        )
          return
        e.preventDefault()
        const startX = e.clientX
        const startY = e.clientY
        const orig = { x: props.x, y: props.y, w: props.w, h: props.h }
        const onMove = (ev: PointerEvent) => {
          const dx = ((ev.clientX - startX) / window.innerWidth) * 100
          const dy = ((ev.clientY - startY) / window.innerHeight) * 100
          props.onDraft?.({
            widgetId: props.widgetId,
            rect: {
              x: orig.x + dx,
              y: orig.y + dy,
              w: orig.w,
              h: orig.h,
            },
            altKey: ev.altKey,
          })
        }
        const onUp = () => {
          window.removeEventListener("pointermove", onMove)
          window.removeEventListener("pointerup", onUp)
        }
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
      }}
    >
      {props.children}
      <div
        aria-hidden
        data-resize-handle="true"
        style={{
          position: "absolute",
          right: 2,
          bottom: 2,
          width: 14,
          height: 14,
          cursor: "nwse-resize",
          background: "color-mix(in oklch, white 70%, transparent)",
          border: "1px solid color-mix(in oklch, black 20%, transparent)",
          borderRadius: 4,
          zIndex: 2,
          boxShadow: "0 1px 4px color-mix(in oklch, black 20%, transparent)",
        }}
        onPointerDown={(e) => {
          if (!props.onDraft) return
          e.preventDefault()
          e.stopPropagation()
          const startX = e.clientX
          const startY = e.clientY
          const orig = { x: props.x, y: props.y, w: props.w, h: props.h }
          const onMove = (ev: PointerEvent) => {
            const dw = ((ev.clientX - startX) / window.innerWidth) * 100
            const dh = ((ev.clientY - startY) / window.innerHeight) * 100
            props.onDraft?.({
              widgetId: props.widgetId,
              rect: {
                x: orig.x,
                y: orig.y,
                w: Math.max(8, orig.w + dw),
                h: Math.max(8, orig.h + dh),
              },
              altKey: ev.altKey,
            })
          }
          const onUp = () => {
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
          }
          window.addEventListener("pointermove", onMove)
          window.addEventListener("pointerup", onUp)
        }}
      />
    </div>
  )
}
