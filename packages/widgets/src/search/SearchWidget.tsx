import type { StyleTokens } from "@yindex/domain"
import { type CSSProperties, type FormEvent, useState } from "react"
import { LensSurface } from "../shell/surface"

export type SearchEngineId =
  | "google"
  | "bing"
  | "duckduckgo"
  | "baidu"
  | "custom"

export type SearchWidgetConfig = {
  readonly engine: SearchEngineId
  readonly customUrl?: string
}

export type SearchWidgetProps = {
  readonly tokens: StyleTokens
  readonly config: SearchWidgetConfig
  readonly showTitle?: boolean | undefined
}

const ENGINE_URL: Record<Exclude<SearchEngineId, "custom">, string> = {
  google: "https://www.google.com/search?q=%s",
  bing: "https://www.bing.com/search?q=%s",
  duckduckgo: "https://duckduckgo.com/?q=%s",
  baidu: "https://www.baidu.com/s?wd=%s",
}

const ENGINE_LABEL: Record<SearchEngineId, string> = {
  google: "Google",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
  baidu: "百度",
  custom: "自定义",
}

export function resolveSearchUrl(
  config: SearchWidgetConfig,
  query: string,
): string {
  const q = encodeURIComponent(query.trim())
  if (config.engine === "custom") {
    const template = config.customUrl ?? "https://www.google.com/search?q=%s"
    return template.includes("%s")
      ? template.replace("%s", q)
      : `${template}${q}`
  }
  return ENGINE_URL[config.engine].replace("%s", q)
}

export function SearchWidget(props: SearchWidgetProps) {
  const [q, setQ] = useState("")
  const canSubmit = q.trim().length > 0
  const engineLabel = ENGINE_LABEL[props.config.engine] ?? "搜索"
  const lensInk = props.tokens.glass.adaptive.lens.foreground
  const field: CSSProperties = {
    flex: 1,
    height: "100%",
    minHeight: 40,
    borderRadius: 999,
    border: "1px solid color-mix(in oklch, white 12%, transparent)",
    background: "transparent",
    color: lensInk,
    padding: "0 16px",
    fontSize: 15,
    outline: "none",
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (!query) return
    window.location.href = resolveSearchUrl(props.config, query)
  }

  return (
    <LensSurface
      tokens={props.tokens}
      shape="capsule"
      title={`搜索 · ${engineLabel}`}
      showTitle={props.showTitle}
    >
      <form
        onSubmit={onSubmit}
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索或输入关键词…"
          aria-label="搜索"
          autoComplete="off"
          spellCheck={false}
          style={field}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            height: "100%",
            minHeight: 40,
            minWidth: 72,
            padding: "0 18px",
            borderRadius: 999,
            border: "none",
            background: props.tokens.color.accent,
            color: props.tokens.color.bg,
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.45,
            letterSpacing: "0.02em",
          }}
        >
          搜索
        </button>
      </form>
    </LensSurface>
  )
}
