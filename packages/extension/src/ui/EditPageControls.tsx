import type { HomeDocument, Page, PageId } from "@yindex/domain"
import {
  addBlankPageToHome,
  deletePageFromHome,
  reorderPageInHome,
  setLandingPage,
  setPageStyle,
} from "@yindex/domain"
import { STYLE_PACKS } from "@yindex/style-packs"
import { ghostBtn } from "./editChromeStyles"

export function EditPageControls(props: {
  readonly doc: HomeDocument
  readonly page: Page
  readonly pageId: PageId
  readonly onDoc: (doc: HomeDocument) => void
}) {
  return (
    <>
      <div style={{ marginTop: 12, marginBottom: 6, opacity: 0.75 }}>
        场景预设
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {STYLE_PACKS.map((pack) => {
          const active =
            props.page.style.wallpaper.kind === "generative" &&
            props.page.style.wallpaper.generativePreset ===
              pack.generativePreset
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => {
                const result = setPageStyle(
                  props.doc,
                  props.pageId,
                  pack.pageStyle,
                )
                if (result.ok) props.onDoc(result.value)
              }}
              style={{
                ...ghostBtn,
                textAlign: "left",
                borderColor: active
                  ? "oklch(0.65 0.12 250)"
                  : "color-mix(in oklch, white 12%, transparent)",
              }}
            >
              <div style={{ fontWeight: 600 }}>{pack.name}</div>
              <div style={{ fontSize: 11, opacity: 0.65 }}>
                {pack.description}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 14, marginBottom: 6, opacity: 0.75 }}>
        页面序列
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button
          type="button"
          style={ghostBtn}
          onClick={() => {
            const result = addBlankPageToHome(props.doc, props.pageId)
            if (result.ok) props.onDoc(result.value)
          }}
        >
          添加空白页
        </button>
        <button
          type="button"
          style={ghostBtn}
          onClick={() => {
            const index = props.doc.sequence.pageIds.indexOf(props.pageId)
            if (index <= 0) return
            const result = reorderPageInHome(props.doc, props.pageId, index - 1)
            if (result.ok) props.onDoc(result.value)
          }}
        >
          上移
        </button>
        <button
          type="button"
          style={ghostBtn}
          onClick={() => {
            const index = props.doc.sequence.pageIds.indexOf(props.pageId)
            if (index < 0 || index >= props.doc.sequence.pageIds.length - 1) {
              return
            }
            const result = reorderPageInHome(props.doc, props.pageId, index + 1)
            if (result.ok) props.onDoc(result.value)
          }}
        >
          下移
        </button>
        <button
          type="button"
          style={ghostBtn}
          onClick={() => {
            const result = setLandingPage(props.doc, props.pageId)
            if (result.ok) props.onDoc(result.value)
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
            if (!confirm(`删除页面「${props.page.name}」？`)) return
            const result = deletePageFromHome(props.doc, props.pageId)
            if (result.ok) props.onDoc(result.value)
          }}
        >
          删除本页
        </button>
      </div>
      <div style={{ fontSize: 11, opacity: 0.55, marginTop: 6 }}>
        共 {props.doc.sequence.pageIds.length} 页 · Landing：
        {props.doc.pages[props.doc.sequence.landingPageId]?.name ?? "—"}
      </div>
    </>
  )
}
