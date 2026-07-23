import type { HomeDocument, PageId, WidgetInstanceId } from "@yindex/domain"
import {
  addPageToHome,
  addWidget,
  builtinSource,
  createBlankPage,
  createWidgetInstance,
  deletePageFromHome,
  removeWidget,
  reorderPageInHome,
  setLandingPage,
  setPageMeta,
  setPageStyle,
  stylePackId,
  withZ,
} from "@yindex/domain"
import { STYLE_PACKS } from "@yindex/style-packs"
import { BUILTIN_CATALOG } from "@yindex/widgets"
import type { CSSProperties } from "react"

export function EditChrome(props: {
  readonly doc: HomeDocument
  readonly pageId: PageId
  readonly selectedWidgetId: WidgetInstanceId | null
  readonly onDoc: (doc: HomeDocument) => void
  readonly onClose: () => void
}) {
  const page = props.doc.pages[props.pageId]
  if (!page) return null

  return (
    <aside style={panel} aria-label="编辑面板">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <strong>编辑当前页</strong>
        <button type="button" onClick={props.onClose} style={ghostBtn}>
          完成
        </button>
      </div>

      <label style={labelStyle}>
        名称
        <input
          value={page.name}
          onChange={(e) => {
            const r = setPageMeta(props.doc, props.pageId, { name: e.target.value })
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
            const r = setPageMeta(props.doc, props.pageId, { icon: e.target.value })
            if (r.ok) props.onDoc(r.value)
          }}
          style={inputStyle}
        />
      </label>

      <div style={{ marginTop: 12, marginBottom: 6, opacity: 0.75 }}>Style Pack</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {STYLE_PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => {
              const r = setPageStyle(props.doc, props.pageId, {
                packId: pack.id,
                overrides: page.style.overrides,
              })
              if (r.ok) props.onDoc(r.value)
            }}
            style={{
              ...ghostBtn,
              textAlign: "left",
              borderColor:
                page.style.packId === pack.id
                  ? "oklch(0.65 0.12 250)"
                  : "color-mix(in oklch, white 12%, transparent)",
            }}
          >
            {pack.name}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14, marginBottom: 6, opacity: 0.75 }}>页面序列</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button
          type="button"
          style={ghostBtn}
          onClick={() => {
            const blank = createBlankPage({
              name: "新页面",
              icon: "页",
              style: { packId: stylePackId("caliper"), overrides: {} },
            })
            const r = addPageToHome(props.doc, blank)
            if (r.ok) props.onDoc(r.value)
          }}
        >
          添加空白页
        </button>
        <button
          type="button"
          style={ghostBtn}
          onClick={() => {
            const idx = props.doc.sequence.pageIds.indexOf(props.pageId)
            if (idx <= 0) return
            const r = reorderPageInHome(props.doc, props.pageId, idx - 1)
            if (r.ok) props.onDoc(r.value)
          }}
        >
          上移
        </button>
        <button
          type="button"
          style={ghostBtn}
          onClick={() => {
            const idx = props.doc.sequence.pageIds.indexOf(props.pageId)
            if (idx < 0 || idx >= props.doc.sequence.pageIds.length - 1) return
            const r = reorderPageInHome(props.doc, props.pageId, idx + 1)
            if (r.ok) props.onDoc(r.value)
          }}
        >
          下移
        </button>
        <button
          type="button"
          style={ghostBtn}
          onClick={() => {
            const r = setLandingPage(props.doc, props.pageId)
            if (r.ok) props.onDoc(r.value)
          }}
        >
          设为 Landing
        </button>
        <button
          type="button"
          style={{ ...ghostBtn, color: "oklch(0.75 0.14 25)" }}
          onClick={() => {
            if (props.doc.sequence.pageIds.length <= 1) {
              alert("至少保留一页")
              return
            }
            if (!confirm(`删除页面「${page.name}」？`)) return
            const r = deletePageFromHome(props.doc, props.pageId)
            if (r.ok) props.onDoc(r.value)
          }}
        >
          删除本页
        </button>
      </div>
      <div style={{ fontSize: 11, opacity: 0.55, marginTop: 6 }}>
        共 {props.doc.sequence.pageIds.length} 页 · Landing：
        {props.doc.pages[props.doc.sequence.landingPageId]?.name ?? "—"}
      </div>

      <div style={{ marginTop: 14, marginBottom: 6, opacity: 0.75 }}>添加小组件</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {BUILTIN_CATALOG.map((entry) => (
          <button
            key={entry.typeId}
            type="button"
            style={ghostBtn}
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

      {props.selectedWidgetId ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ opacity: 0.75, marginBottom: 6 }}>选中小组件</div>
          <button
            type="button"
            style={{ ...ghostBtn, color: "oklch(0.75 0.14 25)" }}
            onClick={() => {
              const selected = props.selectedWidgetId
              if (!selected) return
              const r = removeWidget(props.doc, props.pageId, selected)
              if (r.ok) props.onDoc(r.value)
            }}
          >
            删除选中
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 14, opacity: 0.6, fontSize: 12 }}>
          点击选中 · 拖拽移动 · 右下角缩放 · Alt 临时关闭吸附 · Esc 退出编辑
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

const panel: CSSProperties = {
  position: "fixed",
  right: 20,
  bottom: 72,
  width: 300,
  maxHeight: "min(70vh, 560px)",
  overflow: "auto",
  zIndex: 3200,
  borderRadius: 12,
  padding: 14,
  background: "color-mix(in oklch, oklch(0.22 0.01 260) 92%, transparent)",
  color: "oklch(0.94 0.01 260)",
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 12px 40px color-mix(in oklch, black 35%, transparent)",
  fontSize: 13,
}

const ghostBtn: CSSProperties = {
  border: "1px solid color-mix(in oklch, white 14%, transparent)",
  background: "color-mix(in oklch, white 6%, transparent)",
  color: "inherit",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
}

const inputStyle: CSSProperties = {
  width: "100%",
  marginTop: 4,
  borderRadius: 8,
  border: "1px solid color-mix(in oklch, white 14%, transparent)",
  background: "color-mix(in oklch, black 25%, transparent)",
  color: "inherit",
  padding: "8px 10px",
}

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  opacity: 0.9,
}
