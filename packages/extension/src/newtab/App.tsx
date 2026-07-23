import { useCallback, useMemo, useState } from "react"
import type { PageId, WidgetInstanceId } from "@yindex/domain"
import { setWidgetLayout, updatePage } from "@yindex/domain"
import { useHomeState } from "./useHomeState"
import { usePageTurn } from "./usePageTurn"
import { PageCanvas } from "../ui/PageCanvas"
import { PageDots } from "../ui/PageDots"
import { EditChrome } from "../ui/EditChrome"
import { SettingsPanel } from "../ui/SettingsPanel"

export function App() {
  const { doc, loading, error, setDoc, rememberPage } = useHomeState()
  const [editMode, setEditMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedWidgetId, setSelectedWidgetId] = useState<WidgetInstanceId | null>(null)

  const onPageChange = useCallback(
    (pageId: PageId) => {
      rememberPage(pageId)
    },
    [rememberPage],
  )

  const turn = usePageTurn(doc, { editMode, onPageChange })

  const orderedPages = useMemo(() => {
    if (!doc) return []
    return doc.sequence.pageIds
      .map((id) => doc.pages[id])
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
  }, [doc])

  const currentPageId = turn.currentPageId

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

  function onWidgetLayoutDraft(
    widgetId: WidgetInstanceId,
    rect: { x: number; y: number; w: number; h: number },
  ) {
    if (!doc || !currentPageId) return
    const r = setWidgetLayout(doc, currentPageId, widgetId, rect)
    if (r.ok) setDoc(r.value)
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
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          height: `${orderedPages.length * 100}%`,
          width: "100%",
          transform: `translate3d(0, ${turn.offsetY}%, 0)`,
          transition: turn.isTurning
            ? "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        {orderedPages.map((page) => (
          <div key={page.id} style={{ height: `${100 / orderedPages.length}%`, width: "100%" }}>
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

      <PageDots doc={doc} currentIndex={turn.currentIndex} onSelect={turn.goToIndex} />

      <div
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          display: "flex",
          gap: 8,
          zIndex: 3100,
        }}
      >
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          style={fab}
          aria-label="设置"
        >
          设置
        </button>
        <button
          type="button"
          onClick={() => {
            setEditMode((v) => !v)
            setSelectedWidgetId(null)
          }}
          style={{
            ...fab,
            background: editMode
              ? "oklch(0.55 0.12 250)"
              : "color-mix(in oklch, oklch(0.22 0.01 260) 88%, transparent)",
          }}
          aria-label={editMode ? "完成编辑" : "编辑"}
        >
          {editMode ? "完成" : "编辑"}
        </button>
      </div>

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

const fab = {
  border: "1px solid color-mix(in oklch, white 14%, transparent)",
  background: "color-mix(in oklch, oklch(0.22 0.01 260) 88%, transparent)",
  color: "oklch(0.94 0.01 260)",
  borderRadius: 999,
  padding: "10px 16px",
  backdropFilter: "blur(12px)",
  fontSize: 13,
  cursor: "pointer",
} as const
