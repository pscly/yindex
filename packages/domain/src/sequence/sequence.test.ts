import { describe, expect, test } from "bun:test"
import { pageId } from "../ids/ids"
import {
  adjacentIndex,
  adjacentPageId,
  createSequence,
  insertPage,
  removePage,
  reorderPage,
  resolveOpenPageId,
  setLanding,
} from "./sequence"

const a = pageId("a")
const b = pageId("b")
const c = pageId("c")

describe("PageSequence", () => {
  test("rejects empty sequence", () => {
    const r = createSequence([])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("empty")
  })

  test("defaults landing to first page", () => {
    const r = createSequence([a, b, c])
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.landingPageId).toBe(a)
  })

  test("loops adjacent index", () => {
    const seq = createSequence([a, b, c])
    if (!seq.ok) throw new Error("seq")
    expect(adjacentIndex(seq.value, 0, -1)).toEqual({ ok: true, value: 2 })
    expect(adjacentIndex(seq.value, 2, 1)).toEqual({ ok: true, value: 0 })
    expect(adjacentPageId(seq.value, b, 1)).toEqual({ ok: true, value: c })
  })

  test("cannot remove last page", () => {
    const seq = createSequence([a])
    if (!seq.ok) throw new Error("seq")
    const r = removePage(seq.value, a)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("empty")
  })

  test("remove landing picks fallback", () => {
    const seq = createSequence([a, b, c], a)
    if (!seq.ok) throw new Error("seq")
    const r = removePage(seq.value, a)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.pageIds).toEqual([b, c])
      expect(r.value.landingPageId).toBe(b)
    }
  })

  test("reorder and set landing", () => {
    const seq = createSequence([a, b, c])
    if (!seq.ok) throw new Error("seq")
    const re = reorderPage(seq.value, c, 0)
    expect(re.ok).toBe(true)
    if (!re.ok) return
    expect(re.value.pageIds).toEqual([c, a, b])
    const land = setLanding(re.value, b)
    expect(land.ok).toBe(true)
    if (land.ok) expect(land.value.landingPageId).toBe(b)
  })

  test("insert rejects duplicate", () => {
    const seq = createSequence([a, b])
    if (!seq.ok) throw new Error("seq")
    const r = insertPage(seq.value, a, 1)
    expect(r.ok).toBe(false)
  })

  test("resolveOpenPageId respects remember flag", () => {
    const seq = createSequence([a, b, c], b)
    if (!seq.ok) throw new Error("seq")
    expect(
      resolveOpenPageId(seq.value, { rememberLastPage: false, lastPageId: c }),
    ).toBe(b)
    expect(
      resolveOpenPageId(seq.value, { rememberLastPage: true, lastPageId: c }),
    ).toBe(c)
    expect(
      resolveOpenPageId(seq.value, {
        rememberLastPage: true,
        lastPageId: pageId("missing"),
      }),
    ).toBe(b)
  })
})
