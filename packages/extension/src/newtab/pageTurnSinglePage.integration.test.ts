import { describe, expect, test } from "bun:test"
import { createSequence, pageId } from "@yindex/domain"
import { syncPageTurnDocument } from "./pageTurnDocSync"
import { createIdleGesture, stepGesture } from "./pageTurnGesture"
import {
  type PageTurnHostDeps,
  applyGestureDecision,
  hostTick,
} from "./pageTurnHost"
import { planGoBySettle, planGoToIndex } from "./pageTurnNav"
import {
  TEST_VH,
  settlingGesture,
  trackingGesture,
  visualOf,
} from "./pageTurnTestUtil"

describe("pageTurn single-page — stale and fresh no-op", () => {
  test("Given pageCount=1, When planGoBySettle +1, Then null", () => {
    const seq = createSequence([pageId("p1")])
    expect(seq.ok).toBe(true)
    if (!seq.ok) return
    const plan = planGoBySettle({
      sequence: seq.value,
      currentIndex: 0,
      delta: 1,
      gesture: createIdleGesture(0, 0),
      now: 10,
    })
    expect(plan).toBeNull()
  })

  test("Given pageCount=1 fresh wheel/key, When applied, Then idle offset 0 no commit", () => {
    let gesture = createIdleGesture(0, 0)
    const pageCount = 1
    const index = 0
    let pageChanges = 0
    const deps: PageTurnHostDeps = {
      getGesture: () => gesture,
      setGesture: (g) => {
        gesture = g
      },
      pageCount,
      reducedMotion: false,
      stopSpringRaf: () => {},
      startSettle: () => {
        throw new Error("startSettle must not run for single page")
      },
      onIndexCommitted: () => {
        pageChanges += 1
      },
      bump: () => {},
      goBy: () => {
        pageChanges += 1
      },
      goToIndex: () => {},
      setSpringFromTracking: () => {},
    }

    const wheel = stepGesture(
      gesture,
      { kind: "wheel", deltaPx: 200, now: 5 },
      { viewportHeight: TEST_VH, pageCount, reducedMotion: false },
    )
    gesture = wheel.state
    applyGestureDecision(wheel.decision, deps, 5)
    const v = visualOf(gesture, index, pageCount, 5, false)
    expect(v.offsetY).toBe(0)
    expect(v.isTurning).toBe(false)
    expect(wheel.decision.kind).toBe("none")
    expect(pageChanges).toBe(0)
  })

  test("Given stale tracking at pageCount=1, When tick, Then forced idle no-op visual", () => {
    const stale = trackingGesture(0, 0.5)
    const step = stepGesture(
      stale,
      { kind: "tick", now: 100 },
      { viewportHeight: TEST_VH, pageCount: 1, reducedMotion: false },
    )
    expect(step.decision.kind).toBe("none")
    expect(step.state.phase).toBe("idle")
    expect(step.state.progress).toBe(0)
    const v = visualOf(step.state, 0, 1, 100, false)
    expect(v.offsetY).toBe(0)
    expect(v.isTurning).toBe(false)
  })

  test("Given stale settling at pageCount=1, When visual/hostTick, Then idle no-op", () => {
    const stale = settlingGesture(0, 0.5, 1)
    // visual boundary alone
    const v0 = visualOf(stale, 0, 1, 50, false)
    expect(v0.offsetY).toBe(0)
    expect(v0.isTurning).toBe(false)

    let gesture = stale
    let stopped = false
    const deps: PageTurnHostDeps = {
      getGesture: () => gesture,
      setGesture: (g) => {
        gesture = g
      },
      pageCount: 1,
      reducedMotion: false,
      stopSpringRaf: () => {
        stopped = true
      },
      startSettle: () => {
        throw new Error("must not settle")
      },
      onIndexCommitted: () => {
        throw new Error("must not commit")
      },
      bump: () => {},
      goBy: () => {},
      goToIndex: () => {},
      setSpringFromTracking: () => {},
    }
    hostTick(deps, 60)
    expect(stopped).toBe(true)
    expect(gesture.phase).toBe("idle")
    expect(gesture.progress).toBe(0)
  })

  test("Given pageCount=1 same index while tracking, When planGoToIndex, Then noop", () => {
    const plan = planGoToIndex({
      index: 0,
      pageCount: 1,
      currentIndex: 0,
      phase: "tracking",
      reducedMotion: false,
      now: 0,
    })
    expect(plan.kind).toBe("noop")
  })

  test("Given 2-page→1-page doc shrink while settling, When sync, Then invalidated idle", () => {
    const two = createSequence([pageId("a"), pageId("b")])
    const one = createSequence([pageId("a")])
    expect(two.ok && one.ok).toBe(true)
    if (!two.ok || !one.ok) return

    // Minimal HomeDocument-like objects for sequence identity only
    const doc2 = {
      sequence: two.value,
      pages: {},
      settings: {},
      lastPageId: null,
    }
    const doc1 = {
      sequence: one.value,
      pages: {},
      settings: {},
      lastPageId: null,
    }
    const first = syncPageTurnDocument({
      doc: doc2 as never,
      pageCount: 2,
      currentIndex: 0,
      initialized: false,
      lastSeqKey: "",
      generation: 0,
      gesture: createIdleGesture(0, 0),
    })
    expect(first.initialized).toBe(true)
    const during = settlingGesture(0, 0.4, 1)
    const shrunk = syncPageTurnDocument({
      doc: doc1 as never,
      pageCount: 1,
      currentIndex: 0,
      initialized: true,
      lastSeqKey: first.lastSeqKey,
      generation: first.generation,
      gesture: during,
    })
    expect(shrunk.invalidated).toBe(true)
    expect(shrunk.generation).toBe(first.generation + 1)
    expect(shrunk.gesture.phase).toBe("idle")
    expect(shrunk.gesture.progress).toBe(0)
    const v = visualOf(shrunk.gesture, 0, 1, 0, false)
    expect(v.offsetY).toBe(0)
    expect(v.isTurning).toBe(false)
  })
})
