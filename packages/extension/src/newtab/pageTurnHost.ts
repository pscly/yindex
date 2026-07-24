import {
  type GestureDecision,
  type GestureSnapshot,
  createIdleGesture,
  enterCooldown,
  stepGesture,
} from "./pageTurnGesture"
import { wrapPageIndex } from "./pageTurnLayout"
import { normalizeWheelDelta } from "./pageTurnNormalize"
import {
  isFormControlTarget,
  isScrollableConsuming,
} from "./pageTurnWheelGuard"

export type PageTurnHostDeps = {
  readonly getGesture: () => GestureSnapshot
  readonly setGesture: (g: GestureSnapshot) => void
  readonly pageCount: number
  readonly reducedMotion: boolean
  readonly stopSpringRaf: () => void
  readonly startSettle: (
    targetProgress: number,
    targetIndex: number,
    now: number,
  ) => void
  readonly onIndexCommitted: (index: number, now: number) => void
  readonly bump: () => void
  readonly goBy: (delta: number) => void
  readonly goToIndex: (index: number) => void
  readonly setSpringFromTracking: (progress: number, velocity: number) => void
}

export function applyGestureDecision(
  decision: GestureDecision,
  deps: PageTurnHostDeps,
  now: number,
): void {
  if (decision.kind === "commit") {
    const to = wrapPageIndex(decision.toIndex, deps.pageCount)
    if (deps.reducedMotion) {
      deps.bump()
      return
    }
    deps.startSettle(Math.sign(decision.progress) || 1, to, now)
    return
  }
  if (decision.kind === "return") {
    deps.startSettle(0, decision.index, now)
    return
  }
  if (decision.kind === "reduced_settled") {
    deps.onIndexCommitted(decision.index, now)
    deps.setGesture(enterCooldown(deps.getGesture(), decision.index, now))
    deps.bump()
  }
}

export function handleHostWheel(e: WheelEvent, deps: PageTurnHostDeps): void {
  if (isFormControlTarget(e.target)) return
  if (isScrollableConsuming(e.target, e.deltaY)) return
  if (deps.pageCount <= 1) return
  e.preventDefault()
  const now = performance.now()
  const vh = hostViewportHeight()
  const deltaPx = normalizeWheelDelta({
    deltaY: e.deltaY,
    deltaMode: e.deltaMode,
    viewportHeight: vh,
  })
  if (deltaPx === 0) return
  if (deps.getGesture().phase === "settling") deps.stopSpringRaf()
  const step = stepGesture(
    deps.getGesture(),
    { kind: "wheel", deltaPx, now },
    {
      viewportHeight: vh,
      pageCount: deps.pageCount,
      reducedMotion: deps.reducedMotion,
    },
  )
  deps.setGesture(step.state)
  if (step.state.phase === "tracking") {
    deps.setSpringFromTracking(step.state.progress, step.state.velocity)
  }
  applyGestureDecision(step.decision, deps, now)
  deps.bump()
}

export function handleHostKey(
  e: KeyboardEvent,
  deps: Pick<PageTurnHostDeps, "goBy" | "goToIndex" | "pageCount">,
): void {
  if (isFormControlTarget(e.target)) return
  if (deps.pageCount <= 1) return
  if (e.key === "ArrowDown" || e.key === "PageDown") {
    e.preventDefault()
    deps.goBy(1)
  } else if (e.key === "ArrowUp" || e.key === "PageUp") {
    e.preventDefault()
    deps.goBy(-1)
  } else if (/^[1-9]$/.test(e.key)) {
    deps.goToIndex(Number(e.key) - 1)
  }
}

function hostViewportHeight(): number {
  if (typeof window === "undefined") return 800
  return window.innerHeight || 800
}

export function hostTick(deps: PageTurnHostDeps, now: number): void {
  if (deps.pageCount <= 1) {
    const g = deps.getGesture()
    if (g.phase !== "idle" || g.progress !== 0) {
      deps.stopSpringRaf()
      deps.setGesture(createIdleGesture(g.baseIndex, now))
      deps.bump()
    }
    return
  }
  const g = deps.getGesture()
  if (
    g.phase !== "tracking" &&
    g.phase !== "reduced_fade" &&
    g.phase !== "cooldown"
  ) {
    return
  }
  const step = stepGesture(
    g,
    { kind: "tick", now },
    {
      viewportHeight: hostViewportHeight(),
      pageCount: deps.pageCount,
      reducedMotion: deps.reducedMotion,
    },
  )
  if (g.phase === "reduced_fade") {
    deps.setGesture(step.state)
    applyGestureDecision(step.decision, deps, now)
    deps.bump()
    return
  }
  if (step.state !== g || step.decision.kind !== "none") {
    deps.setGesture(step.state)
    applyGestureDecision(step.decision, deps, now)
    deps.bump()
  }
}

export function bindPageTurnHost(
  deps: PageTurnHostDeps,
  isMounted: () => boolean,
): () => void {
  const onWheel = (e: WheelEvent) => handleHostWheel(e, deps)
  const onKey = (e: KeyboardEvent) =>
    handleHostKey(e, {
      goBy: deps.goBy,
      goToIndex: deps.goToIndex,
      pageCount: deps.pageCount,
    })
  let tickRaf: number | null = null
  const tickLoop = () => {
    if (!isMounted()) return
    hostTick(deps, performance.now())
    tickRaf = requestAnimationFrame(tickLoop)
  }
  tickRaf = requestAnimationFrame(tickLoop)
  window.addEventListener("wheel", onWheel, { passive: false })
  window.addEventListener("keydown", onKey)
  return () => {
    window.removeEventListener("wheel", onWheel)
    window.removeEventListener("keydown", onKey)
    if (tickRaf !== null) cancelAnimationFrame(tickRaf)
  }
}

export function createReducedFadeGesture(
  fromIndex: number,
  toIndex: number,
  now: number,
  pageCount: number,
): GestureSnapshot {
  return stepGesture(
    createIdleGesture(fromIndex, now),
    {
      kind: "begin_reduced_fade",
      fromIndex,
      toIndex,
      now,
    },
    {
      viewportHeight:
        typeof window !== "undefined" ? window.innerHeight || 800 : 800,
      pageCount,
      reducedMotion: true,
    },
  ).state
}
