import {
  buildSnapGuides,
  clampRect,
  snapRect,
  withZ,
} from "./layout"
import type { LayoutConstraints, LayoutRect, RectPct } from "./types"
import { DEFAULT_LAYOUT_CONSTRAINTS } from "./types"

export type ApplyLayoutDraftInput = {
  readonly draft: RectPct
  readonly z: number
  readonly others: readonly LayoutRect[]
  readonly snapEnabled: boolean
  readonly altKeyDisablesSnap: boolean
  readonly constraints?: LayoutConstraints
}

export type ApplyLayoutDraftResult = {
  readonly layout: LayoutRect
  readonly snapped: boolean
}

/**
 * Edit-mode layout finalize: optional snap then clamp into safe area.
 */
export function applyLayoutDraft(
  input: ApplyLayoutDraftInput,
): ApplyLayoutDraftResult {
  const constraints = input.constraints ?? DEFAULT_LAYOUT_CONSTRAINTS
  const snapOn = input.snapEnabled && !input.altKeyDisablesSnap
  const guides = buildSnapGuides(input.others, constraints)
  const snapped = snapRect(input.draft, guides, {
    enabled: snapOn,
    constraints,
  })
  const clamped = clampRect(snapped.rect, constraints)
  return {
    layout: withZ(clamped, input.z),
    snapped: snapOn && snapped.activeGuides.length > 0,
  }
}
