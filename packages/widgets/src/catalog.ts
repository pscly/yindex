import type { WidgetTypeId } from "@yindex/domain"
import { widgetTypeId } from "@yindex/domain"
import type { LensShape } from "./shell/surface"

export type WidgetSurfaceMode = "content-direct" | "lens"

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
    surfaceMode: "content-direct",
  },
  {
    typeId: widgetTypeId("builtin.search"),
    name: "搜索",
    description: "可配置搜索引擎",
    defaultSize: { w: 48, h: 12 },
    surfaceMode: "lens",
    lensShape: "capsule",
  },
  {
    typeId: widgetTypeId("builtin.shortcuts"),
    name: "快捷方式",
    description: "独立启动台链接",
    defaultSize: { w: 48, h: 28 },
    surfaceMode: "lens",
    lensShape: "shelf",
  },
  {
    typeId: widgetTypeId("builtin.weather"),
    name: "天气",
    description: "Open-Meteo 天气",
    defaultSize: { w: 18, h: 16 },
    surfaceMode: "lens",
    lensShape: "capsule",
  },
  {
    typeId: widgetTypeId("builtin.quote"),
    name: "每日一句",
    description: "Hitokoto 或静态回退",
    defaultSize: { w: 36, h: 20 },
    surfaceMode: "content-direct",
  },
  {
    typeId: widgetTypeId("builtin.hexagram"),
    name: "六十四卦",
    description: "矩阵查询与每日抽卦",
    defaultSize: { w: 42, h: 48 },
    surfaceMode: "lens",
    lensShape: "panel",
  },
] as const

export function catalogEntryFor(
  typeId: string,
): BuiltinCatalogEntry | undefined {
  return BUILTIN_CATALOG.find((entry) => entry.typeId === typeId)
}
