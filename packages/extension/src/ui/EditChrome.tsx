import type { HomeDocument, PageId, WidgetInstanceId } from "@yindex/domain"
import {
  addWidget,
  builtinSource,
  createWidgetInstance,
  removeWidget,
  setPageMeta,
  updatePage,
  withZ,
} from "@yindex/domain"
import { BUILTIN_CATALOG } from "@yindex/widgets"
import { EditGlassSection } from "./EditGlassSection"
import { EditPageSequence } from "./EditPageSequence"
import { EditStylePackSection } from "./EditStylePackSection"
import { EditWallpaperSection } from "./EditWallpaperSection"
import { SelectedWidgetEditor } from "./SelectedWidgetEditor"
import {
  accentActionStyle,
  editPanelStyle,
  ghostBtn,
  inputStyle,
  labelStyle,
} from "./chromeStyles"

export function EditChrome(props: {
  readonly doc: HomeDocument
  readonly pageId: PageId
  readonly selectedWidgetId: WidgetInstanceId | null
  readonly onDoc: (doc: HomeDocument) => void
  readonly onClose: () => void
  readonly pageAccent?: string | undefined
  readonly reducedMotion?: boolean | undefined
}) {
  const page = props.doc.pages[props.pageId]
  if (!page) return null
  const selected = props.selectedWidgetId
    ? page.widgets.find((w) => w.id === props.selectedWidgetId)
    : undefined

  function patchSelectedConfig(config: unknown) {
    if (!props.selectedWidgetId) return
    const r = updatePage(props.doc, props.pageId, (pg) => ({
      ...pg,
      widgets: pg.widgets.map((w) =>
        w.id === props.selectedWidgetId ? { ...w, config } : w,
      ),
    }))
    if (r.ok) props.onDoc(r.value)
  }

  const panel = editPanelStyle({
    pageAccent: props.pageAccent,
    reducedMotion: props.reducedMotion,
  })
  const doneStyle = {
    ...ghostBtn,
    ...accentActionStyle({ pageAccent: props.pageAccent }),
  }

  return (
    <aside data-chrome-root style={panel} aria-label="编辑面板">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              opacity: 0.55,
              fontWeight: 600,
            }}
          >
            EDIT
          </div>
          <strong style={{ fontSize: 15 }}>当前页</strong>
        </div>
        <button type="button" onClick={props.onClose} style={doneStyle}>
          完成
        </button>
      </div>

      <label style={labelStyle}>
        名称
        <input
          value={page.name}
          onChange={(e) => {
            const r = setPageMeta(props.doc, props.pageId, {
              name: e.target.value,
            })
            if (r.ok) props.onDoc(r.value)
          }}
          style={inputStyle}
        />
      </label>

      <label style={{ ...labelStyle, marginTop: 10 }}>
        图标
        <input
          value={page.icon}
          maxLength={2}
          onChange={(e) => {
            const r = setPageMeta(props.doc, props.pageId, {
              icon: e.target.value,
            })
            if (r.ok) props.onDoc(r.value)
          }}
          style={inputStyle}
        />
      </label>

      <EditStylePackSection
        doc={props.doc}
        page={page}
        pageId={props.pageId}
        onDoc={props.onDoc}
      />
      <EditGlassSection
        doc={props.doc}
        page={page}
        pageId={props.pageId}
        onDoc={props.onDoc}
      />
      <EditWallpaperSection
        doc={props.doc}
        page={page}
        pageId={props.pageId}
        onDoc={props.onDoc}
      />
      <EditPageSequence
        doc={props.doc}
        page={page}
        pageId={props.pageId}
        onDoc={props.onDoc}
      />

      <div style={{ marginTop: 14, marginBottom: 6, opacity: 0.75 }}>
        添加小组件
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {BUILTIN_CATALOG.map((entry) => (
          <button
            key={entry.typeId}
            type="button"
            style={ghostBtn}
            title={entry.description}
            onClick={() => {
              const instance = createWidgetInstance({
                source: builtinSource(entry.typeId),
                layout: withZ(
                  {
                    x: 12 + Math.random() * 20,
                    y: 12 + Math.random() * 20,
                    w: entry.defaultSize.w,
                    h: entry.defaultSize.h,
                  },
                  page.widgets.length + 1,
                ),
                config: defaultConfigFor(entry.typeId),
              })
              const r = addWidget(props.doc, props.pageId, instance)
              if (r.ok) props.onDoc(r.value)
            }}
          >
            {entry.name}
          </button>
        ))}
      </div>

      {selected && props.selectedWidgetId ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ opacity: 0.75, marginBottom: 6 }}>
            选中：
            {selected.source.kind === "builtin"
              ? selected.source.typeId
              : selected.source.kind === "package"
                ? selected.source.typeId
                : "缺失"}
          </div>
          <div style={{ marginTop: 10 }}>
            <SelectedWidgetEditor
              sourceKind={selected.source.kind}
              typeId={
                selected.source.kind === "missing"
                  ? selected.source.typeId
                  : selected.source.typeId
              }
              config={selected.config}
              onConfig={patchSelectedConfig}
            />
          </div>
          <button
            type="button"
            style={{
              ...ghostBtn,
              color: "oklch(0.75 0.14 25)",
              marginTop: 12,
              width: "100%",
              fontWeight: 600,
            }}
            onClick={() => {
              const id = props.selectedWidgetId
              if (!id) return
              if (!confirm("删除该小组件？布局与配置将移除。")) return
              const r = removeWidget(props.doc, props.pageId, id)
              if (r.ok) props.onDoc(r.value)
            }}
          >
            删除此小组件
          </button>
        </div>
      ) : (
        <div
          style={{ marginTop: 14, opacity: 0.6, fontSize: 12, lineHeight: 1.5 }}
        >
          点击选中 · 拖拽移动 · 右下角缩放 · 角上「×」删除 · Alt 关闭吸附 · Esc
          退出
        </div>
      )}
    </aside>
  )
}

function defaultConfigFor(typeId: string): unknown {
  switch (typeId) {
    case "builtin.search":
      return { engine: "google" }
    case "builtin.shortcuts":
      return { items: [] }
    case "builtin.weather":
      return { mode: "auto", cityLabel: "本地" }
    case "builtin.quote":
      return { source: "hitokoto" }
    case "builtin.clock":
      return { showSeconds: true }
    default:
      return {}
  }
}
