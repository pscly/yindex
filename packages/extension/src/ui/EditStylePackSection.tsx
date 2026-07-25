import type { HomeDocument, Page, PageId } from "@yindex/domain"
import { setPageStyle } from "@yindex/domain"
import { STYLE_PACKS } from "@yindex/style-packs"
import { chromeControlLine, ghostBtn } from "./chromeStyles"

export function EditStylePackSection(props: {
  readonly doc: HomeDocument
  readonly page: Page
  readonly pageId: PageId
  readonly onDoc: (doc: HomeDocument) => void
}) {
  return (
    <section
      style={{ marginTop: 12 }}
      aria-labelledby="edit-style-pack-heading"
    >
      <div
        id="edit-style-pack-heading"
        style={{ marginBottom: 6, opacity: 0.75 }}
      >
        风格包
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
              aria-pressed={active}
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
                border: active
                  ? "1px solid oklch(0.65 0.12 250)"
                  : `1px solid ${chromeControlLine}`,
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
    </section>
  )
}
