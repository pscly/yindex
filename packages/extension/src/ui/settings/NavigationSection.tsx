import type { HomeDocument, PageId } from "@yindex/domain"
import { setLandingPage } from "@yindex/domain"
import { h3, row, section, selectStyle } from "./styles"

export function NavigationSection(props: {
  readonly doc: HomeDocument
  readonly onDoc: (doc: HomeDocument) => void
}) {
  function patchSettings(patch: Partial<HomeDocument["settings"]>): void {
    props.onDoc({
      ...props.doc,
      settings: { ...props.doc.settings, ...patch },
    })
  }

  return (
    <section style={section}>
      <h3 style={h3}>导航</h3>
      <label style={row}>
        <input
          type="checkbox"
          checked={props.doc.settings.rememberLastPage}
          onChange={(e) => patchSettings({ rememberLastPage: e.target.checked })}
        />
        记住上次所在页（关闭则始终打开 Landing）
      </label>
      <label style={row}>
        <input
          type="checkbox"
          checked={props.doc.settings.allowHexagramRedraw}
          onChange={(e) =>
            patchSettings({ allowHexagramRedraw: e.target.checked })
          }
        />
        允许每日重抽六十四卦
      </label>
      <label style={row}>
        <input
          type="checkbox"
          checked={props.doc.settings.snapEnabled}
          onChange={(e) => patchSettings({ snapEnabled: e.target.checked })}
        />
        编辑时启用吸附
      </label>
      <label style={row}>
        <input
          type="checkbox"
          checked={props.doc.settings.showWidgetTitles !== false}
          onChange={(e) => patchSettings({ showWidgetTitles: e.target.checked })}
        />
        显示小组件标题（左上角名称，全局）
      </label>
      <div style={{ marginTop: 8 }}>
        <div style={{ opacity: 0.7, marginBottom: 6, fontSize: 12 }}>
          减少动态效果
        </div>
        <select
          value={props.doc.settings.reducedMotion}
          onChange={(e) => {
            const v = e.target.value
            if (v === "system" || v === "force" || v === "never") {
              patchSettings({ reducedMotion: v })
            }
          }}
          style={selectStyle}
        >
          <option value="system">跟随系统</option>
          <option value="force">始终减少</option>
          <option value="never">始终动画</option>
        </select>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ opacity: 0.7, marginBottom: 6, fontSize: 12 }}>
          Landing 页
        </div>
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
  )
}

