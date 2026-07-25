import type { StyleTokens } from "@yindex/domain"
import type {
  PackageHostInitMessage,
  PackagePermission,
} from "@yindex/widget-sdk"
import { LensSurface } from "@yindex/widgets"
import { useCallback, useEffect, useRef, useState } from "react"
import { handleBridgeMessage } from "../runtime/bridgeHost"
import { instanceStorage } from "../runtime/instanceStorage"
import { getPackage } from "../storage/packageStore"

type PackageWidgetFrameProps = {
  readonly tokens: StyleTokens
  readonly packageId: string
  readonly typeId: string
  readonly instanceId: string
  readonly config: unknown
  readonly reducedMotion: boolean
}

type CreateHostInitMessageInput = {
  readonly instanceId: string
  readonly config: unknown
  readonly reducedMotion: boolean
  readonly size: PackageHostInitMessage["size"]
  readonly tokens: StyleTokens
}

export const PACKAGE_FRAME_SANDBOX =
  "allow-scripts allow-forms allow-modals" as const

function packageCssVars(
  tokens: StyleTokens,
): PackageHostInitMessage["cssVars"] {
  const { lens } = tokens.glass.adaptive
  return {
    "--yindex-ink": lens.foreground,
    "--yindex-muted-ink": lens.mutedForeground,
    "--yindex-lens-ink": lens.foreground,
    "--yindex-lens-muted-ink": lens.mutedForeground,
    "--yindex-accent": tokens.color.accent,
    "--yindex-glass-tint": lens.tint,
    "--yindex-glass-tint-opacity": String(lens.tintOpacity),
    "--yindex-glass-scrim": lens.scrim,
    "--yindex-glass-scrim-opacity": String(lens.scrimOpacity),
    "--yindex-glass-blur": `${tokens.glass.blurPx}px`,
    "--yindex-glass-opacity": String(tokens.glass.opacity),
    "--yindex-glass-saturation": String(tokens.glass.saturation),
    "--yindex-glass-highlight": String(tokens.glass.highlight),
    "--yindex-font-display": tokens.typography.displayFamily,
    "--yindex-font-body": tokens.typography.bodyFamily,
    "--yindex-font-mono": tokens.typography.monoFamily,
    "--yindex-font-body-size": `${tokens.typography.bodySizePx}px`,
    "--yindex-radius-sm": tokens.radius.sm,
    "--yindex-radius-md": tokens.radius.md,
  }
}

export function createHostInitMessage(
  input: CreateHostInitMessageInput,
): PackageHostInitMessage {
  return {
    channel: "yindex-host-init",
    instanceId: input.instanceId,
    config: input.config,
    reducedMotion: input.reducedMotion,
    size: input.size,
    cssVars: packageCssVars(input.tokens),
  }
}

export function isPackageFrameSource(
  source: MessageEventSource | null,
  frameWindow: MessageEventSource | null,
): boolean {
  return frameWindow !== null && source === frameWindow
}

export function PackageWidgetFrame(props: PackageWidgetFrameProps) {
  const [entryUrl, setEntryUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [frameElement, setFrameElement] = useState<HTMLIFrameElement | null>(
    null,
  )
  const grantedRef = useRef<readonly PackagePermission[]>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const frameReadyRef = useRef(false)
  const blobUrls = useRef<string[]>([])

  const bindIframeRef = useCallback((frame: HTMLIFrameElement | null) => {
    iframeRef.current = frame
    setFrameElement(frame)
  }, [])

  useEffect(() => {
    let cancelled = false
    frameReadyRef.current = false
    grantedRef.current = []
    setEntryUrl(null)
    setError(null)
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
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      if (cancelled) {
        URL.revokeObjectURL(url)
        return
      }
      blobUrls.current.push(url)
      setEntryUrl(url)
    })()
    return () => {
      cancelled = true
      for (const u of blobUrls.current) URL.revokeObjectURL(u)
      blobUrls.current = []
    }
  }, [props.packageId, props.typeId])

  const postHostInit = useCallback(() => {
    const frame = iframeRef.current
    const target = frame?.contentWindow
    if (!frame || !target || !frameReadyRef.current) return
    const bounds = frame.getBoundingClientRect()
    target.postMessage(
      createHostInitMessage({
        instanceId: props.instanceId,
        config: props.config,
        reducedMotion: props.reducedMotion,
        size: {
          width: Math.max(0, bounds.width),
          height: Math.max(0, bounds.height),
        },
        tokens: props.tokens,
      }),
      "*",
    )
  }, [props.config, props.instanceId, props.reducedMotion, props.tokens])

  useEffect(() => {
    if (frameReadyRef.current) postHostInit()
  }, [postHostInit])

  useEffect(() => {
    if (!frameElement || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => postHostInit())
    observer.observe(frameElement)
    return () => observer.disconnect()
  }, [frameElement, postHostInit])

  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      const target = iframeRef.current?.contentWindow ?? null
      if (!isPackageFrameSource(event.source, target)) return
      const data = event.data
      if (
        typeof data !== "object" ||
        data === null ||
        Reflect.get(data, "channel") !== "yindex-bridge"
      ) {
        return
      }
      const response = await handleBridgeMessage(data, {
        instanceId: props.instanceId,
        packageId: props.packageId,
        granted: grantedRef.current,
        storage: instanceStorage,
      })
      if (response) target?.postMessage(response, "*")
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [props.instanceId, props.packageId])

  if (error) {
    return (
      <LensSurface tokens={props.tokens} shape="panel" title="运行错误">
        <div
          style={{
            color: props.tokens.glass.adaptive.lens.mutedForeground,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      </LensSurface>
    )
  }

  if (!entryUrl) {
    return (
      <LensSurface tokens={props.tokens} shape="panel" title="加载中">
        <div
          style={{
            color: props.tokens.glass.adaptive.lens.mutedForeground,
            fontSize: 13,
          }}
        >
          Package 启动中…
        </div>
      </LensSurface>
    )
  }

  return (
    <LensSurface tokens={props.tokens} shape="panel">
      <iframe
        ref={bindIframeRef}
        title={`${props.packageId}/${props.typeId}`}
        src={entryUrl}
        sandbox={PACKAGE_FRAME_SANDBOX}
        onLoad={() => {
          frameReadyRef.current = true
          postHostInit()
        }}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          display: "block",
          border: 0,
          borderRadius: props.tokens.radius.sm,
          background: "transparent",
        }}
      />
    </LensSurface>
  )
}
