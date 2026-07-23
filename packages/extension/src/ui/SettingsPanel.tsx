import { useEffect, useState, type CSSProperties, type ChangeEvent } from "react"
import type { HomeDocument, PageId } from "@yindex/domain"
import {
  addWidget,
  createWidgetInstance,
  markPackageMissing,
  packageId,
  restorePackageInstances,
  setLandingPage,
  widgetTypeId,
  withZ,
} from "@yindex/domain"
import { unzipSync, strFromU8 } from "fflate"
import {
  deletePackage,
  installPackageFromFiles,
  listPackages,
  type StoredPackage,
} from "../storage/packageStore"
import { resetHomeDocument } from "../storage/homeStorage"

export function SettingsPanel(props: {
  readonly open: boolean
  readonly doc: HomeDocument
  readonly pageId: PageId | null
  readonly onClose: () => void
  readonly onDoc: (doc: HomeDocument) => void
}) {
  const [packages, setPackages] = useState<readonly StoredPackage[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return
    void listPackages().then(setPackages)
  }, [props.open])

  if (!props.open) return null

  async function refreshPackages() {
    setPackages(await listPackages())
  }

  async function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg(null)
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      let files: Record<string, string> = {}
      if (file.name.endsWith(".json") || file.name === "manifest.json") {
        files["manifest.json"] = new TextDecoder().decode(buf)
        // bare manifest not enough for timer — still allow for validation path
      } else {
        const unzipped = unzipSync(buf)
        for (const [path, data] of Object.entries(unzipped)) {
          if (path.endsWith("/")) continue
          // text decode; binary would need base64 — v1 sample is text html/json
          files[path.replace(/^\/+/, "")] = strFromU8(data)
        }
      }
      // Also support folder-like single html+manifest prebundled import via zip only
      const result = await installPackageFromFiles(files)
      if (!result.ok) {
        setMsg(result.message)
        return
      }
      const restored = restorePackageInstances(
        props.doc,
        result.package.packageId,
        result.package.version,
      )
      props.onDoc(restored)
      await refreshPackages()
      setMsg(`已导入 ${result.package.manifest.name} v${result.package.version}`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "导入失败")
    } finally {
      e.target.value = ""
    }
  }

  async function installBundledPomodoro() {
    setMsg(null)
    try {
      // In extension build, example is copied to examples/pomodoro
      const base = chrome.runtime?.getURL
        ? chrome.runtime.getURL("examples/pomodoro/")
        : "/examples/pomodoro/"
      const manifestRes = await fetch(`${base}manifest.json`)
      const timerRes = await fetch(`${base}timer.html`)
      if (!manifestRes.ok || !timerRes.ok) {
        setMsg("找不到内置示例包资源")
        return
      }
      const manifestText = await manifestRes.text()
      const timerHtml = await timerRes.text()
      const result = await installPackageFromFiles({
        "manifest.json": manifestText,
        "timer.html": timerHtml,
      })
      if (!result.ok) {
        setMsg(result.message)
        return
      }
      let next = restorePackageInstances(
        props.doc,
        result.package.packageId,
        result.package.version,
      )
      // Add instance to current page if none exists
      if (props.pageId) {
        const page = next.pages[props.pageId]
        const has = page?.widgets.some(
          (w) =>
            (w.source.kind === "package" || w.source.kind === "missing") &&
            w.source.packageId === result.package.packageId,
        )
        if (page && !has) {
          const inst = createWidgetInstance({
            source: {
              kind: "package",
              packageId: packageId(result.package.packageId),
              typeId: widgetTypeId("pomodoro.timer"),
              packageVersion: result.package.version,
            },
            layout: withZ({ x: 70, y: 60, w: 24, h: 30 }, 10),
            config: {},
          })
          const added = addWidget(next, props.pageId, inst)
          if (added.ok) next = added.value
        }
      }
      props.onDoc(next)
      await refreshPackages()
      setMsg("已安装示例：番茄钟，并添加到当前页（若尚未存在）")
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "安装示例失败")
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="设置"
      style={overlay}
      onClick={props.onClose}
    >
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>设置</h2>
          <button type="button" style={ghostBtn} onClick={props.onClose}>
            关闭
          </button>
        </div>

        <section style={section}>
          <h3 style={h3}>导航</h3>
          <label style={row}>
            <input
              type="checkbox"
              checked={props.doc.settings.rememberLastPage}
              onChange={(e) => {
                props.onDoc({
                  ...props.doc,
                  settings: {
                    ...props.doc.settings,
                    rememberLastPage: e.target.checked,
                  },
                })
              }}
            />
            记住上次所在页（关闭则始终打开 Landing）
          </label>
          <label style={row}>
            <input
              type="checkbox"
              checked={props.doc.settings.allowHexagramRedraw}
              onChange={(e) => {
                props.onDoc({
                  ...props.doc,
                  settings: {
                    ...props.doc.settings,
                    allowHexagramRedraw: e.target.checked,
                  },
                })
              }}
            />
            允许每日重抽六十四卦
          </label>
          <label style={row}>
            <input
              type="checkbox"
              checked={props.doc.settings.snapEnabled}
              onChange={(e) => {
                props.onDoc({
                  ...props.doc,
                  settings: {
                    ...props.doc.settings,
                    snapEnabled: e.target.checked,
                  },
                })
              }}
            />
            编辑时启用吸附
          </label>
          <div style={{ marginTop: 8 }}>
            <div style={{ opacity: 0.7, marginBottom: 6, fontSize: 12 }}>Landing 页</div>
            <select
              value={props.doc.sequence.landingPageId}
              onChange={(e) => {
                const r = setLandingPage(props.doc, e.target.value as PageId)
                if (r.ok) props.onDoc(r.value)
              }}
              style={selectStyle}
            >
              {props.doc.sequence.pageIds.map((id) => (
                <option key={id} value={id}>
                  {props.doc.pages[id]?.name ?? id}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section style={section}>
          <h3 style={h3}>小组件包</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <label style={ghostBtn}>
              导入 zip
              <input type="file" accept=".zip,application/zip" hidden onChange={onImportFile} />
            </label>
            <button type="button" style={ghostBtn} onClick={() => void installBundledPomodoro()}>
              安装示例番茄钟
            </button>
          </div>
          {packages.length === 0 ? (
            <div style={{ opacity: 0.65, fontSize: 12 }}>尚未安装第三方 Package</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {packages.map((p) => (
                <li key={p.packageId} style={{ marginBottom: 8 }}>
                  <div>
                    {p.manifest.name}{" "}
                    <span style={{ opacity: 0.6 }}>v{p.version}</span>
                  </div>
                  <button
                    type="button"
                    style={{ ...ghostBtn, marginTop: 4 }}
                    onClick={() => {
                      void (async () => {
                        await deletePackage(p.packageId)
                        props.onDoc(markPackageMissing(props.doc, p.packageId))
                        await refreshPackages()
                        setMsg(`已卸载 ${p.manifest.name}（实例保留为缺失）`)
                      })()
                    }}
                  >
                    卸载
                  </button>
                </li>
              ))}
            </ul>
          )}
          {msg ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "oklch(0.8 0.08 200)" }}>{msg}</div>
          ) : null}
        </section>

        <section style={section}>
          <h3 style={h3}>重置</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={ghostBtn}
              onClick={() => {
                if (!confirm("将恢复默认三页配置，确定？")) return
                void resetHomeDocument("default3").then((doc) => {
                  props.onDoc(doc)
                  setMsg("已恢复默认三页")
                })
              }}
            >
              恢复默认三页
            </button>
          </div>
        </section>

        <section style={section}>
          <h3 style={h3}>关于</h3>
          <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
            yindex v0.1.0 · Chrome MV3 新标签页 · 配置仅存本机
          </div>
        </section>
      </div>
    </div>
  )
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 4000,
  background: "color-mix(in oklch, black 45%, transparent)",
  display: "grid",
  placeItems: "center",
  padding: 24,
}

const sheet: CSSProperties = {
  width: "min(480px, 100%)",
  maxHeight: "min(80vh, 720px)",
  overflow: "auto",
  borderRadius: 16,
  padding: 20,
  background: "oklch(0.22 0.01 260)",
  color: "oklch(0.94 0.01 260)",
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  boxShadow: "0 20px 60px color-mix(in oklch, black 40%, transparent)",
}

const section: CSSProperties = { marginTop: 18 }
const h3: CSSProperties = { margin: "0 0 8px", fontSize: 14, fontWeight: 600 }
const row: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  marginBottom: 8,
  fontSize: 13,
  lineHeight: 1.4,
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
const selectStyle: CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid color-mix(in oklch, white 14%, transparent)",
  background: "color-mix(in oklch, black 25%, transparent)",
  color: "inherit",
  padding: "8px 10px",
}
