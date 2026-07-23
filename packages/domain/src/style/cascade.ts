import type { PageStyle, StyleOverride, StyleTokens, WidgetStyleOverride } from "./types"

function mergePartial<T extends object>(base: T, patch: Partial<T> | undefined): T {
  if (!patch) return base
  return { ...base, ...patch }
}

export function applyOverride(base: StyleTokens, override: StyleOverride): StyleTokens {
  return {
    color: mergePartial(base.color, override.color),
    typography: mergePartial(base.typography, override.typography),
    space: mergePartial(base.space, override.space),
    radius: mergePartial(base.radius, override.radius),
    elevation: mergePartial(base.elevation, override.elevation),
    glass: mergePartial(base.glass, override.glass),
    wallpaper: mergePartial(base.wallpaper, override.wallpaper),
    motion: mergePartial(base.motion, override.motion),
  }
}

/**
 * Resolve Page effective tokens = pack defaults + page overrides.
 * Applying a new pack keeps page overrides (product rule).
 */
export function resolvePageTokens(
  packTokens: StyleTokens,
  pageStyle: PageStyle,
): StyleTokens {
  return applyOverride(packTokens, pageStyle.overrides)
}

/**
 * Widget inherits page tokens; instance override wins; "follow page" clears override.
 */
export function resolveWidgetTokens(
  pageTokens: StyleTokens,
  instanceOverride: WidgetStyleOverride | null | undefined,
): StyleTokens {
  if (!instanceOverride) return pageTokens
  return applyOverride(pageTokens, instanceOverride)
}

export function withPack(
  pageStyle: PageStyle,
  packId: PageStyle["packId"],
): PageStyle {
  return { packId, overrides: pageStyle.overrides }
}

export function patchPageOverrides(
  pageStyle: PageStyle,
  patch: StyleOverride,
): PageStyle {
  return {
    packId: pageStyle.packId,
    overrides: {
      color: { ...pageStyle.overrides.color, ...patch.color },
      typography: { ...pageStyle.overrides.typography, ...patch.typography },
      space: { ...pageStyle.overrides.space, ...patch.space },
      radius: { ...pageStyle.overrides.radius, ...patch.radius },
      elevation: { ...pageStyle.overrides.elevation, ...patch.elevation },
      glass: { ...pageStyle.overrides.glass, ...patch.glass },
      wallpaper: { ...pageStyle.overrides.wallpaper, ...patch.wallpaper },
      motion: { ...pageStyle.overrides.motion, ...patch.motion },
    },
  }
}

export function clearPageOverrides(pageStyle: PageStyle): PageStyle {
  return { packId: pageStyle.packId, overrides: {} }
}
