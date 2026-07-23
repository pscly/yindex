import { useEffect, useMemo, useRef, useState } from "react"
import type { StyleTokens } from "@yindex/domain"
import { WidgetSurface } from "@yindex/widgets"
import { getPackage } from "../storage/packageStore"
import { handleBridgeMessage } from "../runtime/bridgeHost"
import { instanceStorage } from "../runtime/instanceStorage"
import type { PackagePermission } from "@yindex/widget-sdk"

export function PackageWidgetFrame(props: {
  readonly tokens: StyleTokens
  readonly packageId: string
  readonly typeId: string
  readonly instanceId: string
  readonly config: unknown
}) {
  const [entryUrl, setEntryUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const grantedRef = useRef<readonly PackagePermission[]>([])
  const blobUrls = useRef<string[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const pkg = await getPackage(props.packageId)
      if (!pkg) {
        if (!cancelled) setError("Package 未安装")
        return
      }
      grantedRef.current = pkg.manifest.permissions
      const type = pkg.manifest.types.find((t) => t.typeId === props.typeId)
      if (!type) {
        if (!cancelled) setError("类型不在 Package 中")
        return
      }
      const entryPath = type.entry.replace(/^\.\//, "")
      const html = pkg.files[entryPath] ?? pkg.files[`./${entryPath}`]
      if (!html) {
        if (!cancelled) setError(`缺少入口 ${entryPath}`)
        return
      }
      // Rewrite relative asset refs if needed; for sample, inline is enough
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      blobUrls.current.push(url)
      if (!cancelled) setEntryUrl(url)
    })()
    return () => {
      cancelled = true
      for (const u of blobUrls.current) URL.revokeObjectURL(u)
      blobUrls.current = []
    }
  }, [props.packageId, props.typeId])

  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      const data = event.data as { channel?: string; instanceId?: string } | null
      if (!data || data.channel !== "yindex-bridge") return
      // Accept from blob iframe; instance scoping best-effort
      const response = await handleBridgeMessage(data, {
        instanceId: props.instanceId,
        packageId: props.packageId,
        granted: grantedRef.current,
        storage: instanceStorage,
      })
      if (response && event.source && "postMessage" in event.source) {
        ;(event.source as Window).postMessage(response, "*")
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [props.instanceId, props.packageId])

  const sandboxSrc = useMemo(() => {
    if (!entryUrl) return null
    // Direct blob entry; host still mediates bridge via window message
    return entryUrl
  }, [entryUrl])

  if (error) {
    return (
      <WidgetSurface tokens={props.tokens} title="运行错误">
        <div style={{ color: props.tokens.color.muted, fontSize: 13 }}>{error}</div>
      </WidgetSurface>
    )
  }

  if (!sandboxSrc) {
    return (
      <WidgetSurface tokens={props.tokens} title="加载中">
        <div style={{ color: props.tokens.color.muted, fontSize: 13 }}>Package 启动中…</div>
      </WidgetSurface>
    )
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: props.tokens.radius.md,
        overflow: "hidden",
        border: `1px solid color-mix(in oklch, ${props.tokens.color.ink} 12%, transparent)`,
        background: props.tokens.color.surface,
      }}
    >
      <iframe
        title={`${props.packageId}/${props.typeId}`}
        src={sandboxSrc}
        sandbox="allow-scripts allow-forms allow-modals"
        style={{ width: "100%", height: "100%", border: 0, background: "transparent" }}
      />
    </div>
  )
}
