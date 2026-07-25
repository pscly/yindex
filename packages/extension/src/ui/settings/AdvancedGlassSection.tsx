import { GLASS_TUNING_BOUNDS } from "@yindex/domain"
import type { GlassTuning, HomeDocument, PageId } from "@yindex/domain"
import { applyGlassTuningToPage } from "./glassTuningControls"
import { h3, inputStyle, labelStyle, row, section } from "./styles"

const GLASS_TUNING_CONTROLS = [
  { key: "transmission", label: "通透" },
  { key: "blur", label: "模糊" },
  { key: "saturation", label: "饱和" },
  { key: "highlight", label: "高光" },
] as const satisfies readonly {
  readonly key: keyof GlassTuning
  readonly label: string
}[]

export type AdvancedGlassSectionProps = {
  readonly doc: HomeDocument
  readonly pageId: PageId | null
  readonly onDoc: (doc: HomeDocument) => void
}

export function AdvancedGlassSection(props: AdvancedGlassSectionProps) {
  if (props.pageId === null) return null
  const pageId = props.pageId
  const page = props.doc.pages[pageId]
  if (page === undefined) return null

  return (
    <details style={section}>
      <summary style={{ ...h3, cursor: "pointer" }}>高级玻璃微调</summary>
      {GLASS_TUNING_CONTROLS.map(({ key, label }) => {
        const bounds = GLASS_TUNING_BOUNDS[key]
        return (
          <label
            key={key}
            style={{
              ...row,
              display: "grid",
              gridTemplateColumns: "52px minmax(0, 1fr) 42px",
              alignItems: "center",
            }}
          >
            <span style={labelStyle}>{label}</span>
            <input
              type="range"
              aria-label={label}
              min={bounds.min}
              max={bounds.max}
              step={bounds.step}
              value={page.style.glassTuning[key]}
              style={{ ...inputStyle, marginTop: 0, padding: 0 }}
              onChange={(event) => {
                const updated = applyGlassTuningToPage(props.doc, pageId, {
                  [key]: event.target.valueAsNumber,
                })
                if (updated !== null) props.onDoc(updated)
              }}
            />
            <output>{page.style.glassTuning[key]}</output>
          </label>
        )
      })}
    </details>
  )
}
