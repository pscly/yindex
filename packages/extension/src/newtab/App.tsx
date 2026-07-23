import { useCallback, useEffect, useMemo, useState } from "react"
import type { PageId, WidgetInstanceId } from "@yindex/domain"
import { applyLayoutDraft, updatePage } from "@yindex/domain"
import { useHomeState } from "./useHomeState"
import { usePageTurn } from "./usePageTurn"
import { PageCanvas, type LayoutDraftEvent } from "../ui/PageCanvas"
import { PageDots } from "../ui/PageDots"
import { EditChrome } from "../ui/EditChrome"
import { SettingsPanel } from "../ui/SettingsPanel"
import { ChromeFab } from "../ui/ChromeFab"

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

  const currentPageId = turn.currentPageId
  const turnMs = turn.reducedMotion ? 0 : 480

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
      <div style={centerMsg}>
        <div style={{ opacity: 0.7 }}>yindex 加载中…</div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div style={centerMsg}>
        <div>加载失败：{error ?? "未知错误"}</div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: `${Math.max(orderedPages.length, 1) * 100}%`,
          width: "100%",
          transform: `translate3d(0, ${turn.offsetY}%, 0)`,
          transition:
            turnMs > 0
              ? `transform ${turnMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
              : "none",
          willChange: "transform",
        }}
      >
        {orderedPages.map((page) => (
          <div
            key={page.id}
            style={{
              height: `${100 / Math.max(orderedPages.length, 1)}%`,
              width: "100%",
            }}
          >
            <div style={{ height: "100vh", width: "100%" }}>
              <PageCanvas
                doc={doc}
                page={page}
                editMode={editMode && page.id === currentPageId}
                selectedWidgetId={selectedWidgetId}
                onSelectWidget={setSelectedWidgetId}
                onWidgetConfig={onWidgetConfig}
                {...(editMode && page.id === currentPageId
                  ? { onWidgetLayoutDraft }
                  : {})}
              />
            </div>
          </div>
        ))}
      </div>

      <PageDots
        doc={doc}
        currentIndex={turn.currentIndex}
        onSelect={turn.goToIndex}
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
        />
      ) : null}

      <SettingsPanel
        open={settingsOpen}
        doc={doc}
        pageId={currentPageId}
        onClose={() => setSettingsOpen(false)}
        onDoc={setDoc}
        onReplaceDoc={replaceDoc}
      />
    </div>
  )
}

const centerMsg = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  color: "#ddd",
  background: "#111",
} as const

