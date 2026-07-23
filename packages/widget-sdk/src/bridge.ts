import { z } from "zod"
import type { PackagePermission } from "./manifest"

export const BRIDGE_TIMEOUT_MS = 5000 as const

export const bridgeRequestSchema = z.object({
  channel: z.literal("yindex-bridge"),
  id: z.string().min(1),
  method: z.string().min(1),
  params: z.unknown().optional(),
})

export const bridgeResponseSchema = z.object({
  channel: z.literal("yindex-bridge"),
  id: z.string().min(1),
  ok: z.boolean(),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
})

export type BridgeRequest = z.infer<typeof bridgeRequestSchema>
export type BridgeResponse = z.infer<typeof bridgeResponseSchema>

export type BridgeMethod =
  | "storage.get"
  | "storage.set"
  | "storage.remove"
  | "notifications.create"
  | "clock.now"
  | "host.log"

export const METHOD_PERMISSIONS: Readonly<Record<BridgeMethod, PackagePermission | null>> = {
  "storage.get": "storage.instance",
  "storage.set": "storage.instance",
  "storage.remove": "storage.instance",
  "notifications.create": "notifications",
  "clock.now": null,
  "host.log": null,
}

export type BridgeErrorCode =
  | "unauthorized"
  | "unknown_method"
  | "timeout"
  | "invalid"
  | "internal"

export function authorizeMethod(
  method: string,
  granted: readonly PackagePermission[],
): { readonly ok: true; readonly method: BridgeMethod } | { readonly ok: false; readonly code: BridgeErrorCode; readonly message: string } {
  if (!(method in METHOD_PERMISSIONS)) {
    return { ok: false, code: "unknown_method", message: `unknown method: ${method}` }
  }
  const m = method as BridgeMethod
  const need = METHOD_PERMISSIONS[m]
  if (need && !granted.includes(need)) {
    return {
      ok: false,
      code: "unauthorized",
      message: `permission required: ${need}`,
    }
  }
  return { ok: true, method: m }
}

export function parseBridgeRequest(
  data: unknown,
):
  | { readonly ok: true; readonly value: BridgeRequest }
  | { readonly ok: false; readonly message: string } {
  const parsed = bridgeRequestSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, message: "invalid bridge request" }
  }
  return { ok: true, value: parsed.data }
}
