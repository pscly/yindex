import type {
  HomeDocument,
  Page,
  PageId,
  WidgetInstanceId,
} from "@yindex/domain"
import { wallpaperCssBackground } from "@yindex/domain"
import { type CSSProperties, useCallback, useState } from "react"
import type { WallpaperAnalysisResult } from "../wallpaper/wallpaperAnalyzer"
import { EditDragShell } from "./EditDragShell"
import type { LayoutDraftEvent } from "./EditDragShell"
import { WallpaperStage } from "./WallpaperStage"
import { WidgetMount } from "./WidgetMount"
import {
  type PageAnalysisPublication,
  adaptiveAnalysisOf,
  pageAnalysisResult,
  wallpaperAnalysisKey,
} from "./pageAnalysis"
import { pageTokenCssVars } from "./pageTokenCssVars"
import { pageTokensOf } from "./pageTokens"

export type { LayoutDraftEvent } from "./EditDragShell"
export { pageTokensOf } from "./pageTokens"

export type PageCanvasProps = {
  readonly doc: HomeDocument
  readonly page: Page
  readonly editMode: boolean
  readonly selectedWidgetId: WidgetInstanceId | null
  readonly onSelectWidget: (id: WidgetInstanceId | null) => void
  readonly onWidgetConfig: (widgetId: string, config: unknown) => void
  readonly onDeleteWidget?: (widgetId: WidgetInstanceId) => void
  readonly onWidgetLayoutDraft?: (event: LayoutDraftEvent) => void
  readonly wallpaperActive?: boolean
  readonly reducedMotion?: boolean
}

export function PageCanvas(props: PageCanvasProps) {
  const wallpaperActive = props.wallpaperActive ?? true
  const reducedMotion = props.reducedMotion ?? false
  const sourceKey = wallpaperAnalysisKey(props.page.style.wallpaper)
  const [published, setPublished] = useState<PageAnalysisPublication | null>(
    null,
  )
  const currentResult = pageAnalysisResult({
    wallpaper: props.page.style.wallpaper,
    active: wallpaperActive,
    published,
  })
  const analysis = adaptiveAnalysisOf(currentResult)
  const tokens = pageTokensOf(props.page, analysis)
  const fallbackBackground =
    props.page.style.wallpaper.kind === "generative"
      ? tokens.wallpaper.cssBackground
      : wallpaperCssBackground({
          kind: "generative",
          generativePreset: "moment",
          dim: props.page.style.wallpaper.dim,
        })
  const onAnalysis = useCallback(
    (result: WallpaperAnalysisResult) => {
      if (wallpaperActive) setPublished({ sourceKey, result })
    },
    [sourceKey, wallpaperActive],
  )

  const rootStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    color: tokens.color.ink,
    fontFamily: tokens.typography.bodyFamily,
    background: fallbackBackground || tokens.color.bg,
    ...pageTokenCssVars(tokens),
  }

  return (
    <section
      style={rootStyle}
      data-page-id={props.page.id}
      data-analysis-ready={currentResult === null ? "false" : "true"}
      data-used-fallback={
        currentResult?.usedFallback === false ? "false" : "true"
      }
      data-lens-polarity={tokens.glass.adaptive.lens.polarity}
      data-content-polarity={tokens.glass.adaptive.contentDirect.polarity}
      aria-label={props.page.name}
      onMouseDown={() => {
        if (props.editMode) props.onSelectWidget(null)
      }}
    >
      <WallpaperStage
        wallpaper={props.page.style.wallpaper}
        active={wallpaperActive}
        reducedMotion={reducedMotion}
        fallbackBackground={fallbackBackground || tokens.color.bg}
        dimColor={tokens.color.bg}
        onAnalysis={onAnalysis}
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
                  border:
                    "1px solid color-mix(in oklch, white 18%, transparent)",
                  background: "oklch(0.42 0.14 25)",
                  color: "white",
                  fontSize: 15,
                  lineHeight: "24px",
                  padding: 0,
                  cursor: "pointer",
                  zIndex: 5,
                  display: "grid",
                  placeItems: "center",
                  boxShadow:
                    "0 4px 14px color-mix(in oklch, black 35%, transparent)",
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
            background:
              "color-mix(in oklch, oklch(0.16 0.008 260) 82%, transparent)",
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
          编辑 · {props.page.name} · 拖拽移动 · 角点缩放 · 选中后 × 删除 · Alt
          关吸附
        </div>
      ) : null}
    </section>
  )
}
