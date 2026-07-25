import { describe, expect, test } from "bun:test"
import {
  ambientHighlightStyle,
  ambientMotionAllowed,
  highlightDriftPeriodSec,
} from "./ambientMotion"

describe("ambientMotionAllowed", () => {
  test("Given OS reduced motion and stored never, When ambient motion resolves, Then OS preference wins", () => {
    const allowed = ambientMotionAllowed({
      reducedMotionSetting: "never",
      osPrefersReduced: true,
      pageActive: true,
    })

    expect(allowed).toBe(false)
  })

  test("Given the in-product force control, When ambient motion resolves, Then it stops", () => {
    const allowed = ambientMotionAllowed({
      reducedMotionSetting: "force",
      osPrefersReduced: false,
      pageActive: true,
    })

    expect(allowed).toBe(false)
  })

  test("Given system motion with no OS reduction, When the Page is active, Then ambient motion runs", () => {
    const allowed = ambientMotionAllowed({
      reducedMotionSetting: "system",
      osPrefersReduced: false,
      pageActive: true,
    })

    expect(allowed).toBe(true)
  })

  test("Given an inactive Page, When ambient motion resolves, Then it stays stopped", () => {
    const allowed = ambientMotionAllowed({
      reducedMotionSetting: "never",
      osPrefersReduced: false,
      pageActive: false,
    })

    expect(allowed).toBe(false)
  })
})

describe("ambient highlight drift", () => {
  test("Given the three profiles, When drift periods resolve, Then they match DESIGN bands", () => {
    expect(highlightDriftPeriodSec("calm")).toBeNull()
    expect(highlightDriftPeriodSec("balanced")).toBeGreaterThanOrEqual(30)
    expect(highlightDriftPeriodSec("balanced")).toBeLessThanOrEqual(45)
    expect(highlightDriftPeriodSec("immersive")).toBeGreaterThanOrEqual(18)
    expect(highlightDriftPeriodSec("immersive")).toBeLessThanOrEqual(30)
  })

  test("Given allowed balanced ambient motion, When highlight style resolves, Then the host emits its period variable", () => {
    const style = ambientHighlightStyle({
      profile: "balanced",
      allowed: true,
      pageActive: true,
    })

    expect(style).toEqual({ "--yindex-highlight-drift-sec": "36s" })
  })

  test("Given reduced, calm, or inactive ambient motion, When highlight style resolves, Then no animation variable is emitted", () => {
    expect(
      ambientHighlightStyle({
        profile: "immersive",
        allowed: false,
        pageActive: true,
      }),
    ).toEqual({})
    expect(
      ambientHighlightStyle({
        profile: "calm",
        allowed: true,
        pageActive: true,
      }),
    ).toEqual({})
    expect(
      ambientHighlightStyle({
        profile: "immersive",
        allowed: true,
        pageActive: false,
      }),
    ).toEqual({})
  })
})
