import type { HomeDocument, PageId } from "@yindex/domain"
import { migrateHomeDocument, serializeHomeDocument } from "@yindex/domain"
import { type ChangeEvent, useEffect, useState } from "react"
import { resetHomeDocument } from "../storage/homeStorage"
import { type StoredPackage, listPackages } from "../storage/packageStore"
import { NavigationSection } from "./settings/NavigationSection"
import { PackageSection } from "./settings/PackageSection"
import {
  ghostBtn,
  h3,
  section,
  settingsOverlayStyle,
  settingsSheetStyle,
} from "./settings/styles"

export function SettingsPanel(props: {
  readonly open: boolean
  readonly doc: HomeDocument
  readonly pageId: PageId | null
  readonly onClose: () => void
  readonly onDoc: (doc: HomeDocument) => void
  readonly onReplaceDoc: (doc: HomeDocument) => void
  readonly pageAccent?: string | undefined
  readonly reducedMotion?: boolean | undefined
}) {
  const [packages, setPackages] = useState<readonly StoredPackage[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return
    void listPackages().then(setPackages)
  }, [props.open])

  if (!props.open) return null

  const overlay = settingsOverlayStyle({
    pageAccent: props.pageAccent,
    reducedMotion: props.reducedMotion,
  })
  const sheet = settingsSheetStyle({
    pageAccent: props.pageAccent,
    reducedMotion: props.reducedMotion,
  })

  async function refreshPackages() {
    setPackages(await listPackages())
  }

  function exportConfig() {
    const blob = new Blob(
      [JSON.stringify(serializeHomeDocument(props.doc), null, 2)],
      { type: "application/json" },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `yindex-home-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg("已导出配置 JSON")
  }

  async function onImportConfig(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg(null)
    try {
      const migrated = migrateHomeDocument(JSON.parse(await file.text()))
      if (!migrated.ok) {
        setMsg(`配置无效：${migrated.error.message}`)
        return
      }
      if (!confirm("导入将覆盖当前 Home 配置，确定？")) return
      props.onReplaceDoc(migrated.value)
      setMsg("配置已导入")
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "配置导入失败")
    } finally {
      e.target.value = ""
    }
  }

  return (
    <dialog
      data-chrome-root
      open
      aria-modal="true"
      aria-label="设置"
      style={overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) props.onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") props.onClose()
      }}
    >
      <div style={sheet}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>设置</h2>
          <button type="button" style={ghostBtn} onClick={props.onClose}>
            关闭
          </button>
        </div>

        <NavigationSection doc={props.doc} onDoc={props.onDoc} />

        <section style={section}>
          <h3 style={h3}>配置导入导出</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={ghostBtn} onClick={exportConfig}>
              导出 JSON
            </button>
            <label style={ghostBtn}>
              导入 JSON
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => void onImportConfig(e)}
              />
            </label>
          </div>
        </section>

        <PackageSection
          doc={props.doc}
          pageId={props.pageId}
          packages={packages}
          msg={msg}
          setMsg={setMsg}
          onDoc={props.onDoc}
          refreshPackages={refreshPackages}
        />

        <section style={section}>
          <h3 style={h3}>重置</h3>
          <button
            type="button"
            style={ghostBtn}
            onClick={() => {
              if (!confirm("将恢复默认三页配置，确定？")) return
              void resetHomeDocument("default3").then((doc) => {
                props.onReplaceDoc(doc)
                setMsg("已恢复默认三页")
              })
            }}
          >
            恢复默认三页
          </button>
        </section>

        <section style={section}>
          <h3 style={h3}>关于</h3>
          <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
            yindex v0.1.3 · Chrome MV3 新标签页 · 配置仅存本机
            <br />
            滚轮翻页 · 编辑拖拽布局 · 设置中可导入小组件包
            <br />
            项目：github.com/pscly/yindex
          </div>
        </section>
      </div>
    </dialog>
  )
}
