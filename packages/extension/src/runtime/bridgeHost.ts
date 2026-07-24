import {
  type BridgeResponse,
  type PackagePermission,
  authorizeMethod,
  parseBridgeRequest,
} from "@yindex/widget-sdk"

export type BridgeHostContext = {
  readonly instanceId: string
  readonly packageId: string
  readonly granted: readonly PackagePermission[]
  readonly storage: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
    remove: (key: string) => Promise<void>
  }
}

export async function handleBridgeMessage(
  data: unknown,
  ctx: BridgeHostContext,
): Promise<BridgeResponse | null> {
  const parsed = parseBridgeRequest(data)
  if (!parsed.ok) return null
  const req = parsed.value
  const auth = authorizeMethod(req.method, ctx.granted)
  if (!auth.ok) {
    return {
      channel: "yindex-bridge",
      id: req.id,
      ok: false,
      error: { code: auth.code, message: auth.message },
    }
  }

  try {
    switch (auth.method) {
      case "clock.now":
        return {
          channel: "yindex-bridge",
          id: req.id,
          ok: true,
          result: { now: Date.now() },
        }
      case "host.log": {
        console.info(`[pkg:${ctx.packageId}]`, req.params)
        return { channel: "yindex-bridge", id: req.id, ok: true, result: true }
      }
      case "storage.get": {
        const key = String(
          (req.params as { key?: string } | undefined)?.key ?? "",
        )
        const value = await ctx.storage.get(`${ctx.instanceId}:${key}`)
        return { channel: "yindex-bridge", id: req.id, ok: true, result: value }
      }
      case "storage.set": {
        const p = req.params as { key?: string; value?: unknown } | undefined
        const key = String(p?.key ?? "")
        await ctx.storage.set(`${ctx.instanceId}:${key}`, p?.value)
        return { channel: "yindex-bridge", id: req.id, ok: true, result: true }
      }
      case "storage.remove": {
        const key = String(
          (req.params as { key?: string } | undefined)?.key ?? "",
        )
        await ctx.storage.remove(`${ctx.instanceId}:${key}`)
        return { channel: "yindex-bridge", id: req.id, ok: true, result: true }
      }
      case "notifications.create": {
        // notifications require extension context; best-effort
        const p = req.params as { title?: string; message?: string } | undefined
        if (typeof chrome !== "undefined" && chrome.notifications?.create) {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon48.png",
            title: p?.title ?? "yindex",
            message: p?.message ?? "",
          })
        }
        return { channel: "yindex-bridge", id: req.id, ok: true, result: true }
      }
      default:
        return {
          channel: "yindex-bridge",
          id: req.id,
          ok: false,
          error: { code: "unknown_method", message: req.method },
        }
    }
  } catch (e) {
    return {
      channel: "yindex-bridge",
      id: req.id,
      ok: false,
      error: {
        code: "internal",
        message: e instanceof Error ? e.message : "internal error",
      },
    }
  }
}
