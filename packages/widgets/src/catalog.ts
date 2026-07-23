import type { WidgetTypeId } from "@yindex/domain"
import { widgetTypeId } from "@yindex/domain"

export type BuiltinCatalogEntry = {
  readonly typeId: WidgetTypeId
  readonly name: string
  readonly description: string
  readonly defaultSize: { readonly w: number; readonly h: number }
}

export const BUILTIN_CATALOG: readonly BuiltinCatalogEntry[] = [
  {
    typeId: widgetTypeId("builtin.clock"),
    name: "日期时钟",
    description: "大时钟与日期星期",
    defaultSize: { w: 36, h: 28 },
  },
  {
    typeId: widgetTypeId("builtin.search"),
    name: "搜索",
    description: "可配置搜索引擎",
    defaultSize: { w: 48, h: 12 },
  },
  {
    typeId: widgetTypeId("builtin.shortcuts"),
    name: "快捷方式",
    description: "独立启动台链接",
    defaultSize: { w: 48, h: 28 },
  },
  {
    typeId: widgetTypeId("builtin.weather"),
    name: "天气",
    description: "Open-Meteo 天气",
    defaultSize: { w: 18, h: 16 },
  },
  {
    typeId: widgetTypeId("builtin.quote"),
    name: "每日一句",
    description: "Hitokoto 或静态回退",
    defaultSize: { w: 36, h: 20 },
  },
  {
    typeId: widgetTypeId("builtin.hexagram"),
    name: "六十四卦",
    description: "矩阵查询与每日抽卦",
    defaultSize: { w: 42, h: 48 },
  },
] as const
