import { describe, expect, test } from "bun:test"
import { createSequence, pageId } from "@yindex/domain"
import { syncPageTurnDocument } from "./pageTurnDocSync"
import { createIdleGesture } from "./pageTurnGesture"
import { springParamsForProfile } from "./pageTurnPolicy"
import { type SettleRuntime, handleSpringSettled } from "./pageTurnSettle"
import { createSpringLoop } from "./pageTurnSpringLoop"
import { settlingGesture, visualOf } from "./pageTurnTestUtil"

describe("pageTurn generation — stale spring callback invalidation", () => {
  test("Given spring gen G, When document replaced gen G+1, Then onSettled is no-op", () => {
    const two = createSequence([pageId("a"), pageId("b")])
    const one = createSequence([pageId("a")])
    expect(two.ok && one.ok).toBe(true)
    if (!two.ok || !one.ok) return

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

    const init = syncPageTurnDocument({
      doc: doc2 as never,
      pageCount: 2,
      currentIndex: 0,
      initialized: false,
      lastSeqKey: "",
      generation: 0,
      gesture: createIdleGesture(0, 0),
    })
    const genAtStart = init.generation
    const settling = settlingGesture(0, 0.6, 1)

    let notified = 0
    let index = 0
    const gestureRef = { current: settling }
    const springRef = { current: { x: 0.6, v: 0 } }
    const generationRef = { current: genAtStart }
    const indexRef = { current: 0 }

    const rt: SettleRuntime = {
      gestureRef,
      springRef,
      springParamsRef: { current: springParamsForProfile("balanced") },
      springLoop: createSpringLoop(),
      generationRef,
      indexRef,
      pageCount: 2,
      reducedMotion: false,
      isMounted: () => true,
      bump: () => {},
      stopRaf: () => {},
      setIndex: (i) => {
        index = i
      },
      notifyPage: () => {
        notified += 1
      },
    }

    // Document shrink invalidates generation
    const after = syncPageTurnDocument({
      doc: doc1 as never,
      pageCount: 1,
      currentIndex: 0,
      initialized: true,
      lastSeqKey: init.lastSeqKey,
      generation: genAtStart,
      gesture: settling,
    })
    generationRef.current = after.generation
    gestureRef.current = after.gesture
    indexRef.current = after.index
    expect(after.generation).toBe(genAtStart + 1)

    // Old spring callback with genAtStart must not notify
    handleSpringSettled(rt, true, 1, 999, genAtStart)
    expect(notified).toBe(0)
    expect(index).toBe(0)
    expect(gestureRef.current.phase).toBe("idle")
    const v = visualOf(gestureRef.current, 0, 1, 999, false)
    expect(v.offsetY).toBe(0)
    expect(v.isTurning).toBe(false)
  })
})
