import type { HomeDocument, PageId } from "@yindex/domain"
import {
  addWidget,
  createWidgetInstance,
  markPackageMissing,
  packageId,
  restorePackageInstances,
  widgetTypeId,
  withZ,
} from "@yindex/domain"
import type { ChangeEvent } from "react"
import {
  type StoredPackage,
  deletePackage,
  installPackageFromFiles,
} from "../../storage/packageStore"
import {
  fetchBundledPomodoro,
  installFromManifestJson,
  installFromZipBytes,
} from "./packageImport"
import { ghostBtn, h3, section } from "./styles"

export function PackageSection(props: {
  readonly doc: HomeDocument
  readonly pageId: PageId | null
  readonly packages: readonly StoredPackage[]
  readonly msg: string | null
  readonly setMsg: (m: string | null) => void
  readonly onDoc: (doc: HomeDocument) => void
  readonly refreshPackages: () => Promise<void>
}) {
  async function onImportZip(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    props.setMsg(null)
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      const result =
        file.name.endsWith(".json") || file.name === "manifest.json"
          ? await installFromManifestJson(new TextDecoder().decode(buf))
          : await installFromZipBytes(buf)
      if (!result.ok) {
        props.setMsg(result.message)
        return
      }
      props.onDoc(
        restorePackageInstances(
          props.doc,
          result.package.packageId,
          result.package.version,
        ),
      )
      await props.refreshPackages()
      props.setMsg(
        `已导入 ${result.package.manifest.name} v${result.package.version}`,
      )
    } catch (err) {
      props.setMsg(err instanceof Error ? err.message : "导入失败")
    } finally {
      e.target.value = ""
    }
  }

  async function installBundledPomodoro() {
    props.setMsg(null)
    try {
      const fetched = await fetchBundledPomodoro()
      if (!fetched.ok) {
        props.setMsg(fetched.message)
        return
      }
      const result = await installPackageFromFiles(fetched.files)
      if (!result.ok) {
        props.setMsg(result.message)
        return
      }
      let next = restorePackageInstances(
        props.doc,
        result.package.packageId,
        result.package.version,
      )
      if (props.pageId) {
        const page = next.pages[props.pageId]
        const has = page?.widgets.some(
          (w) =>
            (w.source.kind === "package" || w.source.kind === "missing") &&
            String(w.source.packageId) === result.package.packageId,
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
      await props.refreshPackages()
      props.setMsg("已安装示例：番茄钟，并添加到当前页（若尚未存在）")
    } catch (err) {
      props.setMsg(err instanceof Error ? err.message : "安装示例失败")
    }
  }

  return (
    <section style={section}>
      <h3 style={h3}>小组件包</h3>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
      >
        <label style={ghostBtn}>
          导入 zip
          <input
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={(e) => void onImportZip(e)}
          />
        </label>
        <button
          type="button"
          style={ghostBtn}
          onClick={() => void installBundledPomodoro()}
        >
          安装示例番茄钟
        </button>
      </div>
      {props.packages.length === 0 ? (
        <div style={{ opacity: 0.65, fontSize: 12 }}>
          尚未安装第三方 Package
        </div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {props.packages.map((p) => (
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
                    await props.refreshPackages()
                    props.setMsg(`已卸载 ${p.manifest.name}（实例保留为缺失）`)
                  })()
                }}
              >
                卸载
              </button>
            </li>
          ))}
        </ul>
      )}
      {props.msg ? (
        <div
          style={{ marginTop: 8, fontSize: 12, color: "oklch(0.8 0.08 200)" }}
        >
          {props.msg}
        </div>
      ) : null}
    </section>
  )
}
