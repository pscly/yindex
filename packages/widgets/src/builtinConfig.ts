import { type BuiltinWidgetTypeId, assertNever } from "@yindex/domain"
import type { ClockWidgetProps } from "./clock/ClockWidget"
import type { HexagramBoardConfig } from "./hexagram/HexagramBoard"
import type { QuoteWidgetConfig } from "./quote/QuoteWidget"
import type { SearchWidgetConfig } from "./search/SearchWidget"
import {
  type ShortcutsWidgetConfig,
  isShortcutsWidgetConfig,
} from "./shortcuts/shortcutsModel"
import type { WeatherWidgetConfig } from "./weather/WeatherWidget"

export type ClockWidgetConfig = Pick<
  ClockWidgetProps,
  "compact" | "showSeconds"
>

export type BuiltinWidgetConfigInput = {
  readonly typeId: string
  readonly config: unknown
}

export type ParsedBuiltinWidgetConfig =
  | { readonly typeId: "builtin.clock"; readonly config: ClockWidgetConfig }
  | { readonly typeId: "builtin.search"; readonly config: SearchWidgetConfig }
  | {
      readonly typeId: "builtin.shortcuts"
      readonly config: ShortcutsWidgetConfig
    }
  | { readonly typeId: "builtin.weather"; readonly config: WeatherWidgetConfig }
  | { readonly typeId: "builtin.quote"; readonly config: QuoteWidgetConfig }
  | {
      readonly typeId: "builtin.hexagram"
      readonly config: HexagramBoardConfig
    }

type ConfigRecord = {
  readonly cityLabel?: unknown
  readonly compact?: unknown
  readonly customUrl?: unknown
  readonly dailyLog?: unknown
  readonly drawnDate?: unknown
  readonly drawnIndex?: unknown
  readonly engine?: unknown
  readonly favicon?: unknown
  readonly id?: unknown
  readonly items?: unknown
  readonly latitude?: unknown
  readonly longitude?: unknown
  readonly mode?: unknown
  readonly notes?: unknown
  readonly refreshHours?: unknown
  readonly showSeconds?: unknown
  readonly source?: unknown
  readonly title?: unknown
  readonly url?: unknown
  readonly [key: string]: unknown
}

function isRecord(value: unknown): value is ConfigRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean"
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string"
}

function isOptionalFiniteNumber(value: unknown): boolean {
  return (
    value === undefined || (typeof value === "number" && Number.isFinite(value))
  )
}

function isClockConfig(value: unknown): value is ClockWidgetConfig {
  return (
    isRecord(value) &&
    isOptionalBoolean(value.compact) &&
    isOptionalBoolean(value.showSeconds)
  )
}

function isSearchConfig(value: unknown): value is SearchWidgetConfig {
  if (!isRecord(value)) return false
  const validEngine =
    value.engine === "google" ||
    value.engine === "bing" ||
    value.engine === "duckduckgo" ||
    value.engine === "baidu" ||
    value.engine === "custom"
  return validEngine && isOptionalString(value.customUrl)
}

function isWeatherConfig(value: unknown): value is WeatherWidgetConfig {
  return (
    isRecord(value) &&
    (value.mode === "auto" || value.mode === "manual") &&
    isOptionalString(value.cityLabel) &&
    isOptionalFiniteNumber(value.latitude) &&
    isOptionalFiniteNumber(value.longitude)
  )
}

function isQuoteConfig(value: unknown): value is QuoteWidgetConfig {
  return (
    isRecord(value) &&
    (value.source === "hitokoto" || value.source === "static") &&
    isOptionalFiniteNumber(value.refreshHours)
  )
}

function isStringRecord(
  value: unknown,
): value is Readonly<Record<string, string>> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "string")
  )
}

function isHexagramConfig(value: unknown): value is HexagramBoardConfig {
  return (
    isRecord(value) &&
    isOptionalFiniteNumber(value.drawnIndex) &&
    isOptionalString(value.drawnDate) &&
    (value.notes === undefined || isStringRecord(value.notes)) &&
    (value.dailyLog === undefined || isStringRecord(value.dailyLog))
  )
}

function recognizeBuiltinTypeId(value: string): BuiltinWidgetTypeId | null {
  switch (value) {
    case "builtin.clock":
    case "builtin.search":
    case "builtin.shortcuts":
    case "builtin.weather":
    case "builtin.quote":
    case "builtin.hexagram":
      return value
    default:
      return null
  }
}

export function parseBuiltinWidgetConfig(
  input: BuiltinWidgetConfigInput,
): ParsedBuiltinWidgetConfig | null {
  const typeId = recognizeBuiltinTypeId(input.typeId)
  if (typeId === null) return null
  switch (typeId) {
    case "builtin.clock":
      return {
        typeId,
        config: isClockConfig(input.config)
          ? input.config
          : { compact: false, showSeconds: true },
      }
    case "builtin.search":
      return {
        typeId,
        config: isSearchConfig(input.config)
          ? input.config
          : { engine: "google" },
      }
    case "builtin.shortcuts":
      return {
        typeId,
        config: isShortcutsWidgetConfig(input.config)
          ? input.config
          : { items: [] },
      }
    case "builtin.weather":
      return {
        typeId,
        config: isWeatherConfig(input.config) ? input.config : { mode: "auto" },
      }
    case "builtin.quote":
      return {
        typeId,
        config: isQuoteConfig(input.config)
          ? input.config
          : { source: "hitokoto" },
      }
    case "builtin.hexagram":
      return {
        typeId,
        config: isHexagramConfig(input.config) ? input.config : {},
      }
    default:
      return assertNever(typeId)
  }
}
