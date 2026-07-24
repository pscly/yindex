import type { SpringParams } from "./pageTurnPolicy"

export type SpringState = {
  readonly x: number
  readonly v: number
}

/**
 * Semi-implicit Euler spring step toward target.
 * With near-critical / slightly overdamped params, does not overshoot.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  dtSec: number,
  params: SpringParams,
): SpringState {
  if (!(dtSec > 0) || !Number.isFinite(dtSec)) return state
  const { stiffness: k, damping: c, mass: m } = params
  if (!(m > 0) || !Number.isFinite(k) || !Number.isFinite(c)) return state

  // Clamp dt to avoid instability if a frame is huge
  const dt = Math.min(dtSec, 1 / 30)
  const displacement = state.x - target
  const accel = (-k * displacement - c * state.v) / m
  const v = state.v + accel * dt
  const x = state.x + v * dt
  return {
    x: Number.isFinite(x) ? x : state.x,
    v: Number.isFinite(v) ? v : 0,
  }
}

export function springSettled(
  state: SpringState,
  target: number,
  eps = 0.001,
  vEps = 0.01,
): boolean {
  return Math.abs(state.x - target) < eps && Math.abs(state.v) < vEps
}

/**
 * Integrate until settled or max steps. Returns trajectory samples of x.
 * Used by tests / harness — not the production RAF path.
 */
export function integrateSpringToSettle(
  from: SpringState,
  target: number,
  params: SpringParams,
  opts: { readonly dtSec?: number; readonly maxSteps?: number } = {},
): readonly number[] {
  const dt = opts.dtSec ?? 1 / 120
  const maxSteps = opts.maxSteps ?? 2000
  const samples: number[] = [from.x]
  let state = from
  for (let i = 0; i < maxSteps; i++) {
    state = stepSpring(state, target, dt, params)
    samples.push(state.x)
    if (springSettled(state, target)) break
  }
  return samples
}

/** True if trajectory never crosses beyond target (no overshoot). */
export function trajectoryHasOvershoot(
  samples: readonly number[],
  from: number,
  target: number,
  tol = 0.002,
): boolean {
  if (target >= from) {
    return samples.some((x) => x > target + tol)
  }
  return samples.some((x) => x < target - tol)
}
