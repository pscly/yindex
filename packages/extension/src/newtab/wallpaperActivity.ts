import type { PageTurnFadeLayers } from "./pageTurnStage"

export function activeWallpaperSlots(input: {
  readonly fadeLayers: PageTurnFadeLayers | null
  readonly offsetY: number
  readonly stripSlots: number
}): ReadonlySet<number> {
  if (input.stripSlots <= 0) return new Set()
  if (input.fadeLayers !== null) {
    const slots = [
      input.fadeLayers.outgoing.index + 1,
      input.fadeLayers.incoming.index + 1,
    ].sort((left, right) => left - right)
    return new Set(slots)
  }

  const position = Math.max(
    0,
    Math.min(input.stripSlots - 1, (-input.offsetY / 100) * input.stripSlots),
  )
  const rounded = Math.round(position)
  if (Math.abs(position - rounded) < 0.000001) return new Set([rounded])
  return new Set([Math.floor(position), Math.ceil(position)])
}
