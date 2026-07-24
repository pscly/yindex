import { useState, type FormEvent } from "react"
import type { StyleTokens } from "@yindex/domain"
import { WidgetSurface } from "../shell/surface"

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

export function resolveSearchUrl(config: SearchWidgetConfig, query: string): string {
  const q = encodeURIComponent(query.trim())
  if (config.engine === "custom") {
    const template = config.customUrl ?? "https://www.google.com/search?q=%s"
    return template.includes("%s") ? template.replace("%s", q) : `${template}${q}`
  }
  return ENGINE_URL[config.engine].replace("%s", q)
}

export function SearchWidget(props: SearchWidgetProps) {
  const [q, setQ] = useState("")
  const canSubmit = q.trim().length > 0
  const engineLabel = ENGINE_LABEL[props.config.engine] ?? "搜索"

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (!query) return
    window.location.href = resolveSearchUrl(props.config, query)
  }

  return (
    <WidgetSurface tokens={props.tokens} title={`搜索 · ${engineLabel}`}>
      <form
        onSubmit={onSubmit}
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索网页…"
          aria-label="搜索"
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            height: 44,
            borderRadius: props.tokens.radius.sm,
            border: `1px solid color-mix(in oklch, ${props.tokens.color.ink} 16%, transparent)`,
            background: "transparent",
            color: props.tokens.color.ink,
            padding: "0 14px",
            fontSize: 15,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            height: 44,
            padding: "0 16px",
            borderRadius: props.tokens.radius.sm,
            border: "none",
            background: props.tokens.color.accent,
            color: props.tokens.color.bg,
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.5,
          }}
        >
          搜索
        </button>
      </form>
    </WidgetSurface>
  )
}
