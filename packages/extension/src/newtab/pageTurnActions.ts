import type { PageSequence } from "@yindex/domain"
import type { GestureSnapshot } from "./pageTurnGestureTypes"
import { planGoBySettle, planGoToIndex } from "./pageTurnNav"
import type { SpringState } from "./pageTurnSpring"

export type GoToAction =
  | { readonly kind: "noop" }
  | { readonly kind: "reduced_fade"; readonly gesture: GestureSnapshot }
  | {
      readonly kind: "snap"
      readonly index: number
      readonly gesture: GestureSnapshot
    }

export type GoByAction =
  | { readonly kind: "noop" }
  | { readonly kind: "reduced"; readonly targetIndex: number }
  | {
      readonly kind: "settle"
      readonly gesture: GestureSnapshot
      readonly spring: SpringState
      readonly generation: number
    }

export function resolveGoToAction(input: {
  readonly index: number
  readonly pageCount: number
  readonly currentIndex: number
  readonly phase: GestureSnapshot["phase"]
  readonly reducedMotion: boolean
  readonly now: number
}): GoToAction {
  if (input.pageCount <= 1) return { kind: "noop" }
  return planGoToIndex(input)
}

export function resolveGoByAction(input: {
  readonly sequence: PageSequence
  readonly currentIndex: number
  readonly delta: number
  readonly gesture: GestureSnapshot
  readonly now: number
  readonly reducedMotion: boolean
  readonly generation: number
}): GoByAction {
  if (input.sequence.pageIds.length <= 1) return { kind: "noop" }
  const plan = planGoBySettle({
    sequence: input.sequence,
    currentIndex: input.currentIndex,
    delta: input.delta,
    gesture: input.gesture,
    now: input.now,
  })
  if (!plan) return { kind: "noop" }
  if (input.reducedMotion) {
    return { kind: "reduced", targetIndex: plan.targetIndex }
  }
  return {
    kind: "settle",
    gesture: plan.gesture,
    spring: { x: plan.springX, v: 0 },
    generation: input.generation,
  }
}
