import type { CSSProperties, ReactNode } from "react"
import type { HomeDocument, Page, PageId, StyleTokens, WidgetInstanceId } from "@yindex/domain"
import { resolvePageTokens } from "@yindex/domain"
import { getStylePack, CALIPER } from "@yindex/style-packs"
import { WidgetMount } from "./WidgetMount"

export type PageCanvasProps = {
  readonly doc: HomeDocument
  readonly page: Page
  readonly editMode: boolean
  readonly selectedWidgetId: WidgetInstanceId | null
  readonly onSelectWidget: (id: WidgetInstanceId | null) => void
  readonly onWidgetConfig: (widgetId: string, config: unknown) => void
  readonly onWidgetLayoutDraft?: (
    widgetId: WidgetInstanceId,
    rect: { x: number; y: number; w: number; h: number },
  ) => void | undefined
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
    <section style={rootStyle} data-page-id={props.page.id} aria-label={props.page.name}>
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
                  ? `1px dashed color-mix(in oklch, ${tokens.color.ink} 25%, transparent)`
                  : "none",
              outlineOffset: 2,
              borderRadius: 4,
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
                <div style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
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
          </div>
        )
      })}
      {props.editMode ? (
        <div
          style={{
            position: "absolute",
            left: 16,
            top: 16,
            padding: "6px 10px",
            borderRadius: 8,
            background: "color-mix(in oklch, black 45%, transparent)",
            color: "white",
            fontSize: 12,
            zIndex: 2000,
            backdropFilter: "blur(8px)",
          }}
        >
          编辑 · {props.page.name}
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
  readonly onDraft?: (
    widgetId: WidgetInstanceId,
    rect: { x: number; y: number; w: number; h: number },
  ) => void | undefined
}) {
  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative", cursor: "move" }}
      onPointerDown={(e) => {
        if (!props.onDraft) return
        e.preventDefault()
        const startX = e.clientX
        const startY = e.clientY
        const orig = { x: props.x, y: props.y, w: props.w, h: props.h }
        const onMove = (ev: PointerEvent) => {
          const dx = ((ev.clientX - startX) / window.innerWidth) * 100
          const dy = ((ev.clientY - startY) / window.innerHeight) * 100
          props.onDraft?.(props.widgetId, {
            x: orig.x + dx,
            y: orig.y + dy,
            w: orig.w,
            h: orig.h,
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
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 14,
          height: 14,
          cursor: "nwse-resize",
          background: "color-mix(in oklch, white 50%, transparent)",
          borderTopLeftRadius: 4,
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
            props.onDraft?.(props.widgetId, {
              x: orig.x,
              y: orig.y,
              w: Math.max(8, orig.w + dw),
              h: Math.max(8, orig.h + dh),
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
