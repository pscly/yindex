import { describe, expect, test } from "bun:test"
import {
  MOTION_PROFILE_TABLE,
  SPRING_BASE,
  springParamsForProfile,
} from "./pageTurnPolicy"
import {
  integrateSpringToSettle,
  springSettled,
  stepSpring,
  trajectoryHasOvershoot,
} from "./pageTurnSpring"

describe("pageTurnSpring", () => {
  test("Given DESIGN Page Turn baseline, When reading the public spring, Then it is 180/26 with unit mass", () => {
    expect(SPRING_BASE).toEqual({ stiffness: 180, damping: 26, mass: 1 })
  })

  test("Given near-critical spring from 0.3 to 1, When integrated, Then no overshoot", () => {
    const samples = integrateSpringToSettle({ x: 0.3, v: 0 }, 1, SPRING_BASE)
    expect(trajectoryHasOvershoot(samples, 0.3, 1)).toBe(false)
    const last = samples[samples.length - 1]
    expect(last).toBeDefined()
    if (last === undefined) return
    expect(Math.abs(last - 1)).toBeLessThan(0.01)
  })

  test("Given near-critical spring from 0.4 to 0 (return), When integrated, Then no overshoot", () => {
    const samples = integrateSpringToSettle({ x: 0.4, v: 0.2 }, 0, SPRING_BASE)
    expect(trajectoryHasOvershoot(samples, 0.4, 0)).toBe(false)
  })

  test("Given calm profile, When spring settles to 1, Then no overshoot", () => {
    const calm = springParamsForProfile("calm")
    const calmSamples = integrateSpringToSettle({ x: 0, v: 0 }, 1, calm)
    expect(trajectoryHasOvershoot(calmSamples, 0, 1)).toBe(false)
    const last = calmSamples[calmSamples.length - 1]
    expect(last).toBeDefined()
    if (last === undefined) return
    expect(Math.abs(last - 1)).toBeLessThan(0.02)
  })

  test("Given immersive profile, When spring settles, Then no overshoot", () => {
    const immersive = springParamsForProfile("immersive")
    const samples = integrateSpringToSettle({ x: 0.1, v: 1.2 }, 1, immersive)
    expect(trajectoryHasOvershoot(samples, 0.1, 1)).toBe(false)
  })

  test("Given balanced profile, When spring settles from rest, Then no overshoot", () => {
    const balanced = springParamsForProfile("balanced")
    const samples = integrateSpringToSettle({ x: 0, v: 0 }, 1, balanced)
    expect(trajectoryHasOvershoot(samples, 0, 1)).toBe(false)
  })

  test("Given zero dt, When stepSpring, Then state unchanged", () => {
    const s = { x: 0.5, v: 0.1 }
    expect(stepSpring(s, 1, 0, SPRING_BASE)).toEqual(s)
  })

  test("Given near target with low velocity, When springSettled, Then true", () => {
    expect(springSettled({ x: 1.0001, v: 0.001 }, 1)).toBe(true)
  })

  test("Given profile table, When reading scales, Then calm 0.7 / balanced 1 / immersive 1.15", () => {
    expect(MOTION_PROFILE_TABLE.calm.springScale).toBe(0.7)
    expect(MOTION_PROFILE_TABLE.balanced.springScale).toBe(1)
    expect(MOTION_PROFILE_TABLE.immersive.springScale).toBe(1.15)
    expect(MOTION_PROFILE_TABLE.immersive.parallaxMax).toBe(0.03)
    expect(MOTION_PROFILE_TABLE.calm.parallaxMax).toBe(0)
  })

  test("Given DESIGN ambient profiles, When reading highlight drift periods, Then calm is off and animated periods stay in range", () => {
    // Given / When
    const calm = MOTION_PROFILE_TABLE.calm.highlightDriftSec
    const balanced = MOTION_PROFILE_TABLE.balanced.highlightDriftSec
    const immersive = MOTION_PROFILE_TABLE.immersive.highlightDriftSec

    // Then
    expect(calm).toBeNull()
    expect(balanced).toBeGreaterThanOrEqual(30)
    expect(balanced).toBeLessThanOrEqual(45)
    expect(immersive).toBeGreaterThanOrEqual(18)
    expect(immersive).toBeLessThanOrEqual(30)
    expect(MOTION_PROFILE_TABLE.immersive.parallaxMax).toBeLessThanOrEqual(0.03)
  })

  test("Given Settings motion profiles, When resolving spring params, Then Home consumes DESIGN multipliers", () => {
    expect(springParamsForProfile("calm").stiffness).toBeCloseTo(126)
    expect(springParamsForProfile("balanced")).toEqual(SPRING_BASE)
    expect(springParamsForProfile("immersive").stiffness).toBeCloseTo(207)
  })
  test("Given production-reachable state at target with outward velocity, When stepping 1/60 across profiles, Then spring stays exactly at target", () => {
    const dt = 1 / 60
    const forward = { x: 1, v: 9.509998672048866 }
    const reverse = { x: -1, v: -9.509998672048866 }
    for (const profile of ["calm", "balanced", "immersive"] as const) {
      const params = springParamsForProfile(profile)
      const nextFwd = stepSpring(forward, 1, dt, params)
      expect(nextFwd.x).toBe(1)
      expect(nextFwd.v).toBe(0)
      const nextRev = stepSpring(reverse, -1, dt, params)
      expect(nextRev.x).toBe(-1)
      expect(nextRev.v).toBe(0)
    }
  })

  test("Given production-reachable outward velocity at target, When integrating a full settle, Then no sample crosses beyond target", () => {
    for (const profile of ["calm", "balanced", "immersive"] as const) {
      const params = springParamsForProfile(profile)
      const forward = integrateSpringToSettle(
        { x: 1, v: 9.509998672048866 },
        1,
        params,
        { dtSec: 1 / 60 },
      )
      expect(trajectoryHasOvershoot(forward, 1, 1, 0)).toBe(false)
      expect(Math.max(...forward)).toBe(1)
      const reverse = integrateSpringToSettle(
        { x: -1, v: -9.509998672048866 },
        -1,
        params,
        { dtSec: 1 / 60 },
      )
      expect(trajectoryHasOvershoot(reverse, -1, -1, 0)).toBe(false)
      expect(Math.min(...reverse)).toBe(-1)
    }
  })
})
