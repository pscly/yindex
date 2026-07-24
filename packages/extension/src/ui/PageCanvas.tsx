import type { CSSProperties, ReactNode } from "react"
import type {
  HomeDocument,
  Page,
  PageId,
  StyleTokens,
  WidgetInstanceId,
} from "@yindex/domain"
import { resolvePageTokens } from "@yindex/domain"
import { getStylePack, CALIPER } from "@yindex/style-packs"
import { WidgetMount } from "./WidgetMount"

export type LayoutDraftEvent = {
  readonly widgetId: WidgetInstanceId
  readonly rect: { x: number; y: number; w: number; h: number }
  readonly altKey: boolean
}

export type PageCanvasProps = {
  readonly doc: HomeDocument
  readonly page: Page
  readonly editMode: boolean
  readonly selectedWidgetId: WidgetInstanceId | null
  readonly onSelectWidget: (id: WidgetInstanceId | null) => void
  readonly onWidgetConfig: (widgetId: string, config: unknown) => void
  readonly onDeleteWidget?: (widgetId: WidgetInstanceId) => void
  readonly onWidgetLayoutDraft?: (event: LayoutDraftEvent) => void
}

export function pageTokensOf(page: Page): StyleTokens {
  const pack = getStylePack(page.style.packId) ?? CALIPER
  return resolvePageTokens(pack.tokens, page.style)
}

export function PageCanvas(props: PageCanvasProps) {
  const tokens = pageTokensOf(props.page)
  const wallpaper = tokens.wallpaper.value ?? tokens.color.bg

  const rootStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    color: tokens.color.ink,
    fontFamily: tokens.typography.bodyFamily,
    background: wallpaper,
  }

  return (
    <section
      style={rootStyle}
      data-page-id={props.page.id}
      aria-label={props.page.name}
      onMouseDown={() => {
        if (props.editMode) props.onSelectWidget(null)
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `color-mix(in oklch, ${tokens.color.bg} ${tokens.wallpaper.dim * 100}%, transparent)`,
          pointerEvents: "none",
        }}
      />
      {props.page.widgets.map((w) => {
        const selected = props.editMode && props.selectedWidgetId === w.id
        return (
          <div
            key={w.id}
            data-widget-id={w.id}
            onMouseDown={(e) => {
              if (!props.editMode) return
              e.stopPropagation()
              props.onSelectWidget(w.id)
            }}
            style={{
              position: "absolute",
              left: `${w.layout.x}%`,
              top: `${w.layout.y}%`,
              width: `${w.layout.w}%`,
              height: `${w.layout.h}%`,
              zIndex: w.layout.z + (selected ? 1000 : 0),
              outline: selected
                ? `2px solid ${tokens.color.accent}`
                : props.editMode
                  ? `1px dashed color-mix(in oklch, ${tokens.color.ink} 18%, transparent)`
                  : "none",
              outlineOffset: 3,
              borderRadius: 10,
              pointerEvents: "auto",
            }}
          >
            {props.editMode ? (
              <EditDragShell
                widgetId={w.id}
                x={w.layout.x}
                y={w.layout.y}
                w={w.layout.w}
                h={w.layout.h}
                {...(props.onWidgetLayoutDraft
                  ? { onDraft: props.onWidgetLayoutDraft }
                  : {})}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                >
                  <WidgetMount
                    doc={props.doc}
                    pageId={props.page.id as PageId}
                    widget={w}
                    pageTokens={tokens}
                    editMode={props.editMode}
                    onWidgetConfig={props.onWidgetConfig}
                  />
                </div>
              </EditDragShell>
            ) : (
              <WidgetMount
                doc={props.doc}
                pageId={props.page.id as PageId}
                widget={w}
                pageTokens={tokens}
                editMode={props.editMode}
                onWidgetConfig={props.onWidgetConfig}
              />
            )}
            {props.editMode && props.onDeleteWidget && selected ? (
              <button
                type="button"
                aria-label="删除小组件"
                title="删除"
                data-resize-handle="true"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!confirm("删除该小组件？")) return
                  props.onDeleteWidget?.(w.id)
                  props.onSelectWidget(null)
                }}
                style={{
                  position: "absolute",
                  top: -11,
                  right: -11,
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: "1px solid color-mix(in oklch, white 18%, transparent)",
                  background: "oklch(0.42 0.14 25)",
                  color: "white",
                  fontSize: 15,
                  lineHeight: "24px",
                  padding: 0,
                  cursor: "pointer",
                  zIndex: 5,
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 4px 14px color-mix(in oklch, black 35%, transparent)",
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        )
      })}
      {props.editMode ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 18,
            transform: "translateX(-50%)",
            padding: "8px 14px",
            borderRadius: 999,
            background: "color-mix(in oklch, oklch(0.16 0.008 260) 82%, transparent)",
            color: "oklch(0.94 0.01 260)",
            fontSize: 12,
            letterSpacing: "0.02em",
            zIndex: 2000,
            backdropFilter: "blur(12px)",
            border: "1px solid color-mix(in oklch, white 12%, transparent)",
            boxShadow: "0 8px 24px color-mix(in oklch, black 25%, transparent)",
            whiteSpace: "nowrap",
          }}
        >
          编辑 · {props.page.name} · 拖拽移动 · 角点缩放 · 选中后 × 删除 · Alt 关吸附
        </div>
      ) : null}
    </section>
  )
}

function EditDragShell(props: {
  readonly widgetId: WidgetInstanceId
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly children: ReactNode
  readonly onDraft?: (event: LayoutDraftEvent) => void
}) {
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
        if ((e.target as HTMLElement).dataset["resizeHandle"] === "true") return
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
