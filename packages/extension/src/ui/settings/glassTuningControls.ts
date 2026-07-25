import {
  DEFAULT_GLASS_TUNING,
  GLASS_TUNING_BOUNDS,
  createGlassTuning,
  setPageStyle,
  withGlassTuning,
} from "@yindex/domain"
import type { GlassTuning, HomeDocument, PageId } from "@yindex/domain"

export function clampGlassTuningInput(
  partial: Partial<GlassTuning>,
): GlassTuning {
  const clamped = {
    transmission: Math.min(
      GLASS_TUNING_BOUNDS.transmission.max,
      Math.max(
        GLASS_TUNING_BOUNDS.transmission.min,
        partial.transmission ?? DEFAULT_GLASS_TUNING.transmission,
      ),
    ),
    blur: Math.min(
      GLASS_TUNING_BOUNDS.blur.max,
      Math.max(
        GLASS_TUNING_BOUNDS.blur.min,
        partial.blur ?? DEFAULT_GLASS_TUNING.blur,
      ),
    ),
    saturation: Math.min(
      GLASS_TUNING_BOUNDS.saturation.max,
      Math.max(
        GLASS_TUNING_BOUNDS.saturation.min,
        partial.saturation ?? DEFAULT_GLASS_TUNING.saturation,
      ),
    ),
    highlight: Math.min(
      GLASS_TUNING_BOUNDS.highlight.max,
      Math.max(
        GLASS_TUNING_BOUNDS.highlight.min,
        partial.highlight ?? DEFAULT_GLASS_TUNING.highlight,
      ),
    ),
  }
  const tuning = createGlassTuning(clamped)
  return tuning.ok ? tuning.value : DEFAULT_GLASS_TUNING
}

export function applyGlassTuningToPage(
  doc: HomeDocument,
  pageId: PageId,
  partial: Partial<GlassTuning>,
): HomeDocument | null {
  const page = doc.pages[pageId]
  if (page === undefined) return null
  const glassTuning = clampGlassTuningInput({
    ...page.style.glassTuning,
    ...partial,
  })
  const result = setPageStyle(
    doc,
    pageId,
    withGlassTuning(page.style, glassTuning),
  )
  return result.ok ? result.value : null
}
