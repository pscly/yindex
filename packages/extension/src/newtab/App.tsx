import type { PageId, WidgetInstanceId } from "@yindex/domain"
import { applyLayoutDraft, removeWidget, updatePage } from "@yindex/domain"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ChromeFab } from "../ui/ChromeFab"
import { EditChrome } from "../ui/EditChrome"
import { type LayoutDraftEvent, PageCanvas } from "../ui/PageCanvas"
import { PageDots } from "../ui/PageDots"
import { SettingsPanel } from "../ui/SettingsPanel"
import { centerMessageStyle, homeRootStyle } from "./appStyles"
import { cyclicSlotCount } from "./pageTurnLayout"
import { PageTurnStage } from "./pageTurnStage"
import { useHomeState } from "./useHomeState"
import { usePageTurn } from "./usePageTurn"
import { activeWallpaperSlots } from "./wallpaperActivity"

export function App() {
  const {
    doc,
    loading,
    error,
    setDoc,
    patchDoc,
    replaceDoc,
    rememberPage,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useHomeState()
  const [editMode, setEditMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedWidgetId, setSelectedWidgetId] =
    useState<WidgetInstanceId | null>(null)

  const onPageChange = useCallback(
    (pageId: PageId) => {
      rememberPage(pageId)
    },
    [rememberPage],
  )

  const turn = usePageTurn(doc, {
    editMode,
    settingsOpen,
    onPageChange,
  })

  const orderedPages = useMemo(() => {
    if (!doc) return []
    return doc.sequence.pageIds
      .map((id) => doc.pages[id])
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
  }, [doc])

  // Loop strip: [clone_last, ...pages, clone_first] so boundary turns stay filled.
  const stripPages = useMemo(() => {
    if (orderedPages.length <= 1) return orderedPages
    const first = orderedPages[0]
    const last = orderedPages[orderedPages.length - 1]
    if (!first || !last) return orderedPages
    return [last, ...orderedPages, first]
  }, [orderedPages])

  const stripSlots = Math.max(cyclicSlotCount(orderedPages.length), 1)
  const currentPageId = turn.currentPageId
  const pageAccent =
    currentPageId && doc?.pages[currentPageId]
      ? doc.pages[currentPageId].style.seedPalette.accent
      : undefined
  const wallpaperSlots = activeWallpaperSlots({
    fadeLayers: turn.fadeLayers,
    offsetY: turn.offsetY,
    stripSlots,
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (settingsOpen) {
          setSettingsOpen(false)
          return
        }
        if (editMode) {
          setEditMode(false)
          setSelectedWidgetId(null)
        }
      }
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return
        }
        e.preventDefault()
        undo()
      }
      if (
        meta &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return
        }
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [settingsOpen, editMode, undo, redo])

  function onWidgetConfig(widgetId: string, config: unknown) {
    if (!doc || !currentPageId) return
    const r = updatePage(doc, currentPageId, (page) => ({
      ...page,
      widgets: page.widgets.map((w) =>
        w.id === widgetId ? { ...w, config } : w,
      ),
    }))
    if (r.ok) setDoc(r.value)
  }

  function onDeleteWidget(widgetId: WidgetInstanceId) {
    if (!doc || !currentPageId) return
    const r = removeWidget(doc, currentPageId, widgetId)
    if (r.ok) {
      setDoc(r.value)
      setSelectedWidgetId(null)
    }
  }

  function onWidgetLayoutDraft(event: LayoutDraftEvent) {
    if (!doc || !currentPageId) return
    const page = doc.pages[currentPageId]
    if (!page) return
    const widget = page.widgets.find((w) => w.id === event.widgetId)
    if (!widget) return
    const others = page.widgets
      .filter((w) => w.id !== event.widgetId)
      .map((w) => w.layout)
    const applied = applyLayoutDraft({
      draft: event.rect,
      z: widget.layout.z,
      others,
      snapEnabled: doc.settings.snapEnabled,
      altKeyDisablesSnap: event.altKey,
    })
    const nextR = updatePage(doc, currentPageId, (pg) => ({
      ...pg,
      widgets: pg.widgets.map((w) =>
        w.id === event.widgetId ? { ...w, layout: applied.layout } : w,
      ),
    }))
    if (nextR.ok) patchDoc(nextR.value)
  }

  if (loading) {
    return (
      <div style={centerMessageStyle}>
        <div style={{ opacity: 0.7 }}>yindex 加载中…</div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div style={centerMessageStyle}>
        <div>加载失败：{error ?? "未知错误"}</div>
      </div>
    )
  }

  return (
    <div style={homeRootStyle}>
      <PageTurnStage
        fadeLayers={turn.fadeLayers}
        isAnimating={turn.isAnimating}
        offsetY={turn.offsetY}
        parallaxY={turn.parallaxY}
        stripSlots={stripSlots}
      >
        {stripPages.map((page, slot) => {
          const isEditable =
            editMode &&
            page.id === currentPageId &&
            slot > 0 &&
            slot <= orderedPages.length
          return (
            <div
              key={`${page.id}#${slot}`}
              style={{ height: "100vh", width: "100%" }}
            >
              <PageCanvas
                doc={doc}
                page={page}
                editMode={isEditable}
                wallpaperActive={wallpaperSlots.has(slot)}
                reducedMotion={turn.reducedMotion}
                selectedWidgetId={selectedWidgetId}
                onSelectWidget={setSelectedWidgetId}
                onWidgetConfig={onWidgetConfig}
                {...(isEditable ? { onWidgetLayoutDraft, onDeleteWidget } : {})}
              />
            </div>
          )
        })}
      </PageTurnStage>

      <PageDots
        doc={doc}
        currentIndex={turn.currentIndex}
        onSelect={turn.goToIndex}
        {...(pageAccent ? { accent: pageAccent } : {})}
      />

      <ChromeFab
        editMode={editMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSettings={() => setSettingsOpen(true)}
        onToggleEdit={() => {
          setEditMode((v) => !v)
          setSelectedWidgetId(null)
        }}
        reducedMotion={turn.reducedMotion}
        {...(pageAccent ? { pageAccent } : {})}
      />

      {editMode && currentPageId ? (
        <EditChrome
          doc={doc}
          pageId={currentPageId}
          selectedWidgetId={selectedWidgetId}
          onDoc={setDoc}
          onClose={() => {
            setEditMode(false)
            setSelectedWidgetId(null)
          }}
          reducedMotion={turn.reducedMotion}
          {...(pageAccent ? { pageAccent } : {})}
        />
      ) : null}

      <SettingsPanel
        open={settingsOpen}
        doc={doc}
        pageId={currentPageId}
        onClose={() => setSettingsOpen(false)}
        onDoc={setDoc}
        onReplaceDoc={replaceDoc}
        reducedMotion={turn.reducedMotion}
        {...(pageAccent ? { pageAccent } : {})}
      />
    </div>
  )
}
