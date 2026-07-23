import { brandAs, type Brand } from "./brand"

export type PageId = Brand<string, "PageId">
export type WidgetInstanceId = Brand<string, "WidgetInstanceId">
export type WidgetTypeId = Brand<string, "WidgetTypeId">
export type PackageId = Brand<string, "PackageId">
export type StylePackId = Brand<string, "StylePackId">

export function pageId(value: string): PageId {
  return brandAs(value)
}

export function widgetInstanceId(value: string): WidgetInstanceId {
  return brandAs(value)
}

export function widgetTypeId(value: string): WidgetTypeId {
  return brandAs(value)
}

export function packageId(value: string): PackageId {
  return brandAs(value)
}

export function stylePackId(value: string): StylePackId {
  return brandAs(value)
}

export function createId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${rand}`
}
