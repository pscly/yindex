import type { BuiltinWidgetTypeId, WidgetTypeId } from "@yindex/domain"
import { widgetTypeId } from "@yindex/domain"
import type { LensShape, WidgetSurfaceVariant } from "./shell/surface"

export type WidgetSurfaceMode = "content-direct" | "lens"

export const SURFACE_VARIANT_BY_TYPE = {
  "builtin.clock": { kind: "content-direct" },
  "builtin.search": { kind: "lens", shape: "capsule" },
  "builtin.shortcuts": { kind: "lens", shape: "shelf" },
  "builtin.weather": { kind: "lens", shape: "capsule" },
  "builtin.quote": { kind: "content-direct" },
  "builtin.hexagram": { kind: "lens", shape: "panel" },
} as const satisfies Record<BuiltinWidgetTypeId, WidgetSurfaceVariant>

export type BuiltinCatalogEntry = {
  readonly typeId: WidgetTypeId
  readonly name: string
  readonly description: string
  readonly defaultSize: { readonly w: number; readonly h: number }
  readonly surfaceMode: WidgetSurfaceMode
  readonly lensShape?: LensShape
}

export const BUILTIN_CATALOG: readonly BuiltinCatalogEntry[] = [
  {
    typeId: widgetTypeId("builtin.clock"),
    name: "日期时钟",
    description: "大时钟与日期星期",
    defaultSize: { w: 36, h: 28 },
    surfaceMode: SURFACE_VARIANT_BY_TYPE["builtin.clock"].kind,
  },
  {
    typeId: widgetTypeId("builtin.search"),
    name: "搜索",
    description: "可配置搜索引擎",
    defaultSize: { w: 48, h: 12 },
    surfaceMode: SURFACE_VARIANT_BY_TYPE["builtin.search"].kind,
    lensShape: SURFACE_VARIANT_BY_TYPE["builtin.search"].shape,
  },
  {
    typeId: widgetTypeId("builtin.shortcuts"),
    name: "快捷方式",
    description: "独立启动台链接",
    defaultSize: { w: 48, h: 28 },
    surfaceMode: SURFACE_VARIANT_BY_TYPE["builtin.shortcuts"].kind,
    lensShape: SURFACE_VARIANT_BY_TYPE["builtin.shortcuts"].shape,
  },
  {
    typeId: widgetTypeId("builtin.weather"),
    name: "天气",
    description: "Open-Meteo 天气",
    defaultSize: { w: 18, h: 16 },
    surfaceMode: SURFACE_VARIANT_BY_TYPE["builtin.weather"].kind,
    lensShape: SURFACE_VARIANT_BY_TYPE["builtin.weather"].shape,
  },
  {
    typeId: widgetTypeId("builtin.quote"),
    name: "每日一句",
    description: "Hitokoto 或静态回退",
    defaultSize: { w: 36, h: 20 },
    surfaceMode: SURFACE_VARIANT_BY_TYPE["builtin.quote"].kind,
  },
  {
    typeId: widgetTypeId("builtin.hexagram"),
    name: "六十四卦",
    description: "矩阵查询与每日抽卦",
    defaultSize: { w: 42, h: 48 },
    surfaceMode: SURFACE_VARIANT_BY_TYPE["builtin.hexagram"].kind,
    lensShape: SURFACE_VARIANT_BY_TYPE["builtin.hexagram"].shape,
  },
] as const

export function catalogEntryFor(
  typeId: string,
): BuiltinCatalogEntry | undefined {
  return BUILTIN_CATALOG.find((entry) => entry.typeId === typeId)
}
