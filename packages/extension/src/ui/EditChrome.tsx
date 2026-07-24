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
  updatePage,
  withZ,
} from "@yindex/domain"
import { STYLE_PACKS } from "@yindex/style-packs"
import { BUILTIN_CATALOG, faviconForUrl } from "@yindex/widgets"
import type { CSSProperties, ChangeEvent } from "react"

export function EditChrome(props: {
  readonly doc: HomeDocument
  readonly pageId: PageId
  readonly selectedWidgetId: WidgetInstanceId | null
  readonly onDoc: (doc: HomeDocument) => void
  readonly onClose: () => void
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

  return (
    <aside style={panel} aria-label="编辑面板">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", opacity: 0.55, fontWeight: 600 }}>EDIT</div>
          <strong style={{ fontSize: 15 }}>当前页</strong>
        </div>
        <button type="button" onClick={props.onClose} style={{ ...ghostBtn, background: "oklch(0.62 0.14 36)", borderColor: "transparent", fontWeight: 600 }}>
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
            <div style={{ fontWeight: 600 }}>{pack.name}</div>
            <div style={{ fontSize: 11, opacity: 0.65 }}>{pack.description}</div>
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
        <div style={{ marginTop: 14, opacity: 0.6, fontSize: 12, lineHeight: 1.5 }}>
          点击选中 · 拖拽移动 · 右下角缩放 · 角上「×」删除 · Alt 关闭吸附 · Esc 退出
        </div>
      )}
    </aside>
  )
}

function SelectedWidgetEditor(props: {
  readonly sourceKind: string
  readonly typeId: string
  readonly config: unknown
  readonly onConfig: (config: unknown) => void
}) {
  if (props.sourceKind !== "builtin") {
    return (
      <div style={{ fontSize: 12, opacity: 0.65 }}>
        Package 小组件配置由其内部界面处理。
      </div>
    )
  }

  if (props.typeId === "builtin.clock") {
    const showSeconds =
      typeof props.config === "object" &&
      props.config !== null &&
      "showSeconds" in props.config
        ? Boolean((props.config as { showSeconds?: boolean }).showSeconds)
        : true
    return (
      <label style={rowCheck}>
        <input
          type="checkbox"
          checked={showSeconds}
          onChange={(e) => props.onConfig({ showSeconds: e.target.checked })}
        />
        显示秒
      </label>
    )
  }

  if (props.typeId === "builtin.search") {
    const cfg =
      typeof props.config === "object" && props.config !== null
        ? (props.config as { engine?: string; customUrl?: string })
        : {}
    const engine = cfg.engine ?? "google"
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={labelStyle}>
          搜索引擎
          <select
            value={engine}
            onChange={(e) =>
              props.onConfig({
                engine: e.target.value,
                customUrl: cfg.customUrl,
              })
            }
            style={inputStyle}
          >
            <option value="google">Google</option>
            <option value="bing">Bing</option>
            <option value="duckduckgo">DuckDuckGo</option>
            <option value="baidu">百度</option>
            <option value="custom">自定义</option>
          </select>
        </label>
        {engine === "custom" ? (
          <label style={labelStyle}>
            自定义 URL（%s 为查询词）
            <input
              value={cfg.customUrl ?? ""}
              placeholder="https://example.com/?q=%s"
              onChange={(e) =>
                props.onConfig({ engine: "custom", customUrl: e.target.value })
              }
              style={inputStyle}
            />
          </label>
        ) : null}
      </div>
    )
  }

  if (props.typeId === "builtin.weather") {
    const cfg =
      typeof props.config === "object" && props.config !== null
        ? (props.config as {
            mode?: string
            cityLabel?: string
            latitude?: number
            longitude?: number
          })
        : {}
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={labelStyle}>
          定位
          <select
            value={cfg.mode ?? "auto"}
            onChange={(e) =>
              props.onConfig({
                ...cfg,
                mode: e.target.value,
              })
            }
            style={inputStyle}
          >
            <option value="auto">自动（定位 / 默认上海）</option>
            <option value="manual">手动经纬度</option>
          </select>
        </label>
        <label style={labelStyle}>
          城市标签
          <input
            value={cfg.cityLabel ?? ""}
            onChange={(e) => props.onConfig({ ...cfg, cityLabel: e.target.value })}
            style={inputStyle}
            placeholder="本地"
          />
        </label>
        {(cfg.mode ?? "auto") === "manual" ? (
          <>
            <label style={labelStyle}>
              纬度
              <input
                type="number"
                step="0.01"
                value={cfg.latitude ?? 31.23}
                onChange={(e) =>
                  props.onConfig({
                    ...cfg,
                    mode: "manual",
                    latitude: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              经度
              <input
                type="number"
                step="0.01"
                value={cfg.longitude ?? 121.47}
                onChange={(e) =>
                  props.onConfig({
                    ...cfg,
                    mode: "manual",
                    longitude: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </label>
          </>
        ) : null}
      </div>
    )
  }

  if (props.typeId === "builtin.quote") {
    const cfg =
      typeof props.config === "object" && props.config !== null
        ? (props.config as { source?: string; refreshHours?: number })
        : {}
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={labelStyle}>
          来源
          <select
            value={cfg.source ?? "hitokoto"}
            onChange={(e) =>
              props.onConfig({
                source: e.target.value,
                refreshHours: cfg.refreshHours,
              })
            }
            style={inputStyle}
          >
            <option value="hitokoto">Hitokoto 网络</option>
            <option value="static">静态回退句</option>
          </select>
        </label>
      </div>
    )
  }

  if (props.typeId === "builtin.shortcuts") {
    const cfg =
      typeof props.config === "object" && props.config !== null
        ? (props.config as {
            items?: Array<{ id: string; title: string; url: string; favicon?: string }>
          })
        : {}
    const items = cfg.items ?? []
    return (
      <ShortcutsEditor
        items={items}
        onChange={(next) => props.onConfig({ items: next })}
      />
    )
  }

  return (
    <div style={{ fontSize: 12, opacity: 0.65 }}>此类型暂无额外配置项。</div>
  )
}

function ShortcutsEditor(props: {
  readonly items: Array<{
    id: string
    title: string
    url: string
    favicon?: string
  }>
  readonly onChange: (
    items: Array<{ id: string; title: string; url: string; favicon?: string }>,
  ) => void
}) {
  function addItem(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = String(fd.get("title") ?? "").trim()
    let url = String(fd.get("url") ?? "").trim()
    if (!title || !url) return
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    const favicon = faviconForUrl(url)
    props.onChange([
      ...props.items,
      {
        id: `s_${Date.now().toString(36)}`,
        title,
        url,
        ...(favicon ? { favicon } : {}),
      },
    ])
    e.currentTarget.reset()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {props.items.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.6 }}>还没有链接</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
          {props.items.map((item) => (
            <li
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.title}
              </span>
              <button
                type="button"
                style={{ ...ghostBtn, padding: "2px 8px" }}
                onClick={() =>
                  props.onChange(props.items.filter((x) => x.id !== item.id))
                }
              >
                删
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={addItem} style={{ display: "grid", gap: 6 }}>
        <input name="title" placeholder="标题" style={inputStyle} required />
        <input name="url" placeholder="https://…" style={inputStyle} required />
        <button type="submit" style={ghostBtn}>
          添加链接
        </button>
      </form>
    </div>
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
  bottom: 84,
  width: 312,
  maxHeight: "min(72vh, 620px)",
  overflow: "auto",
  zIndex: 3200,
  borderRadius: 16,
  padding: 16,
  background: "color-mix(in oklch, oklch(0.16 0.008 260) 92%, transparent)",
  color: "oklch(0.94 0.01 260)",
  border: "1px solid color-mix(in oklch, white 11%, transparent)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  boxShadow: "0 18px 50px color-mix(in oklch, black 42%, transparent)",
  fontSize: 13,
}

const ghostBtn: CSSProperties = {
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  background: "color-mix(in oklch, white 5%, transparent)",
  color: "inherit",
  borderRadius: 10,
  padding: "7px 11px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
}

const inputStyle: CSSProperties = {
  width: "100%",
  marginTop: 5,
  borderRadius: 10,
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  background: "color-mix(in oklch, black 28%, transparent)",
  color: "inherit",
  padding: "9px 11px",
  boxSizing: "border-box",
}

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.06em",
  opacity: 0.75,
  fontWeight: 600,
}

const rowCheck: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12.5,
}
