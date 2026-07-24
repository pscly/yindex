import type {
  PackageId,
  PageId,
  WidgetInstanceId,
  WidgetTypeId,
} from "../ids/ids"
import type { LayoutRect } from "../layout/types"
import type { PageSequence } from "../sequence/sequence"
import type { MotionProfile } from "../style/glass"
import type { PageStyle, WidgetStyleOverride } from "../style/types"

export const HOME_SCHEMA_VERSION = 2 as const

export type BuiltinWidgetTypeId =
  | "builtin.clock"
  | "builtin.search"
  | "builtin.shortcuts"
  | "builtin.weather"
  | "builtin.quote"
  | "builtin.hexagram"

export type WidgetSource =
  | { readonly kind: "builtin"; readonly typeId: WidgetTypeId }
  | {
      readonly kind: "package"
      readonly packageId: PackageId
      readonly typeId: WidgetTypeId
      readonly packageVersion: string
    }
  | {
      readonly kind: "missing"
      readonly packageId: PackageId
      readonly typeId: WidgetTypeId
      readonly lastPackageVersion: string
      readonly savedConfig: unknown
    }

export type WidgetInstance = {
  readonly id: WidgetInstanceId
  readonly source: WidgetSource
  readonly layout: LayoutRect
  readonly config: unknown
  readonly styleOverride: WidgetStyleOverride | null
}

export type Page = {
  readonly id: PageId
  readonly name: string
  readonly icon: string
  readonly style: PageStyle
  readonly widgets: readonly WidgetInstance[]
}

export type HomeSettings = {
  readonly rememberLastPage: boolean
  readonly allowHexagramRedraw: boolean
  readonly snapEnabled: boolean
  /** When false, hide all builtin widget corner titles */
  readonly showWidgetTitles: boolean
  readonly reducedMotion: "system" | "force" | "never"
  readonly locale: "zh-CN"
  readonly motionProfile: MotionProfile
}

export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  rememberLastPage: false,
  allowHexagramRedraw: false,
  snapEnabled: true,
  showWidgetTitles: false,
  reducedMotion: "system",
  locale: "zh-CN",
  motionProfile: "balanced",
}

export type HomeDocument = {
  readonly schemaVersion: typeof HOME_SCHEMA_VERSION
  readonly sequence: PageSequence
  readonly pages: Readonly<Record<string, Page>>
  readonly settings: HomeSettings
  readonly lastPageId: PageId | null
}
