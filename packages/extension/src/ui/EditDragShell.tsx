import type { RectPct, WidgetInstanceId } from "@yindex/domain"
import type { KeyboardEvent, ReactNode } from "react"

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
  readonly selected?: boolean
  readonly onSelect?: () => void
}

type KeyboardLayoutCommand =
  | "right"
  | "left"
  | "up"
  | "down"
  | "grow"
  | "shrink"

const MIN_WIDGET_SIZE_PCT = 8

export function keyboardLayoutRect(
  rect: RectPct,
  command: KeyboardLayoutCommand,
  largeStep = false,
): RectPct {
  const step = largeStep ? 5 : 1
  switch (command) {
    case "right":
      return { ...rect, x: rect.x + step }
    case "left":
      return { ...rect, x: rect.x - step }
    case "up":
      return { ...rect, y: rect.y - step }
    case "down":
      return { ...rect, y: rect.y + step }
    case "grow":
      return { ...rect, w: rect.w + step, h: rect.h + step }
    case "shrink":
      return {
        ...rect,
        w: Math.max(MIN_WIDGET_SIZE_PCT, rect.w - step),
        h: Math.max(MIN_WIDGET_SIZE_PCT, rect.h - step),
      }
  }
}

export function EditDragShell(props: EditDragShellProps) {
  const rect = { x: props.x, y: props.y, w: props.w, h: props.h }

  function publishKeyboardDraft(
    command: KeyboardLayoutCommand,
    largeStep = false,
  ) {
    props.onDraft?.({
      widgetId: props.widgetId,
      rect: keyboardLayoutRect(rect, command, largeStep),
      altKey: false,
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    if (!props.selected) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        props.onSelect?.()
      }
      return
    }
    let command: KeyboardLayoutCommand | null = null
    switch (event.key) {
      case "ArrowRight":
        command = "right"
        break
      case "ArrowLeft":
        command = "left"
        break
      case "ArrowUp":
        command = "up"
        break
      case "ArrowDown":
        command = "down"
        break
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
    publishKeyboardDraft(command, event.shiftKey)
  }

  return (
    <div
      // biome-ignore lint/a11y/noNoninteractiveTabindex: this spatial layout control consumes arrow-key commands.
      tabIndex={0}
      aria-label="编辑小组件布局"
      data-edit-drag-shell={props.selected ? "true" : undefined}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        cursor: "move",
      }}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        props.onSelect?.()
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
      {props.selected ? (
        <div
          data-resize-handle="true"
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            display: "flex",
            gap: 8,
            zIndex: 3,
          }}
        >
          <button
            type="button"
            aria-label="缩小小组件"
            data-resize-handle="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              publishKeyboardDraft("shrink")
            }}
            style={{ width: 44, height: 44 }}
          >
            −
          </button>
          <button
            type="button"
            aria-label="增大小组件"
            data-resize-handle="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              publishKeyboardDraft("grow")
            }}
            style={{ width: 44, height: 44 }}
          >
            +
          </button>
        </div>
      ) : null}
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
                w: Math.max(MIN_WIDGET_SIZE_PCT, orig.w + dw),
                h: Math.max(MIN_WIDGET_SIZE_PCT, orig.h + dh),
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
