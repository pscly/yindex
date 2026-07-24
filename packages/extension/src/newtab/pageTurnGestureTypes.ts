export type TurnDirection = 1 | -1

export type GesturePhase =
  | "idle"
  | "tracking"
  | "settling"
  | "cooldown"
  | "reduced_fade"

export type GestureSnapshot = {
  readonly phase: GesturePhase
  readonly progress: number
  readonly velocity: number
  readonly wheelAccPx: number
  readonly lockedDir: TurnDirection | null
  readonly baseIndex: number
  readonly targetIndex: number | null
  readonly settleTarget: number
  readonly cooldownUntil: number
  readonly lastSampleAt: number
  readonly reducedFadeFrom: number
  readonly reducedFadeTo: number
  readonly reducedFadeStartAt: number
}

export type GestureEvent =
  | { readonly kind: "wheel"; readonly deltaPx: number; readonly now: number }
  | { readonly kind: "tick"; readonly now: number }
  | {
      readonly kind: "begin_settle"
      readonly targetProgress: number
      readonly targetIndex: number
      readonly now: number
    }
  | {
      readonly kind: "begin_reduced_fade"
      readonly fromIndex: number
      readonly toIndex: number
      readonly now: number
    }
  | {
      readonly kind: "force_idle"
      readonly index: number
      readonly now: number
    }

export type GestureDecision =
  | { readonly kind: "none" }
  | {
      readonly kind: "commit"
      readonly fromIndex: number
      readonly toIndex: number
      readonly progress: number
      readonly velocity: number
    }
  | {
      readonly kind: "return"
      readonly index: number
      readonly progress: number
      readonly velocity: number
    }
  | { readonly kind: "settled"; readonly index: number }
  | { readonly kind: "reduced_settled"; readonly index: number }

export type GestureStep = {
  readonly state: GestureSnapshot
  readonly decision: GestureDecision
}
