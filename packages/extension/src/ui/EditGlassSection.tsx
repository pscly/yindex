import {
  GLASS_PROFILES,
  type GlassProfile,
  type HomeDocument,
  type Page,
  type PageId,
} from "@yindex/domain"
import { chromeControlLine, ghostBtn } from "./chromeStyles"
import { applyGlassProfile } from "./editPageStyle"

const GLASS_PROFILE_LABELS = {
  clear: "清透",
  balanced: "均衡",
  deep: "沉静",
} as const satisfies Readonly<Record<GlassProfile, string>>

export type EditGlassSectionProps = {
  readonly doc: HomeDocument
  readonly page: Page
  readonly pageId: PageId
  readonly onDoc: (doc: HomeDocument) => void
}

export function selectGlassProfile(
  props: EditGlassSectionProps,
  profile: GlassProfile,
): void {
  const updated = applyGlassProfile(
    props.doc,
    props.pageId,
    props.page.style,
    profile,
  )
  if (updated !== null) props.onDoc(updated)
}

export function EditGlassSection(props: EditGlassSectionProps) {
  return (
    <section style={{ marginTop: 14 }} aria-labelledby="edit-glass-heading">
      <div id="edit-glass-heading" style={{ marginBottom: 6, opacity: 0.75 }}>
        玻璃档位
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
        }}
      >
        {GLASS_PROFILES.map((profile) => {
          const active = props.page.style.glassProfile === profile
          return (
            <button
              key={profile}
              type="button"
              aria-pressed={active}
              style={{
                ...ghostBtn,
                border: active
                  ? "1px solid oklch(0.65 0.12 250)"
                  : `1px solid ${chromeControlLine}`,
              }}
              onClick={() => selectGlassProfile(props, profile)}
            >
              {GLASS_PROFILE_LABELS[profile]}
            </button>
          )
        })}
      </div>
    </section>
  )
}
