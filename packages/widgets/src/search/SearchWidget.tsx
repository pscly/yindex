import type { StyleTokens } from "@yindex/domain"
import { type CSSProperties, type SyntheticEvent, useState } from "react"
import { parseSafeNavigationUrl } from "../navigation/safeNavigationUrl"
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
): string | null {
  const q = encodeURIComponent(query.trim())
  let candidate: string
  if (config.engine === "custom") {
    const template = config.customUrl ?? "https://www.google.com/search?q=%s"
    candidate = template.includes("%s")
      ? template.replace("%s", q)
      : `${template}${q}`
  } else {
    candidate = ENGINE_URL[config.engine].replace("%s", q)
  }
  const safe = parseSafeNavigationUrl(candidate)
  return safe.ok ? safe.value : null
}

export type SearchNavigationAssign = (url: string) => void

export function commitSearchNavigation(
  config: SearchWidgetConfig,
  query: string,
  assign: SearchNavigationAssign = (url) => {
    window.location.href = url
  },
): boolean {
  const target = resolveSearchUrl(config, query)
  if (!target) return false
  assign(target)
  return true
}

export function SearchWidget(props: SearchWidgetProps) {
  const [q, setQ] = useState("")
  const engineLabel = ENGINE_LABEL[props.config.engine] ?? "搜索"
  const field: CSSProperties = {
    flex: 1,
    height: "100%",
    minHeight: 40,
    border: "none",
    background: "transparent",
    color: "var(--yindex-widget-foreground)",
    padding: 0,
    fontSize: 15,
    outline: "none",
  }

  function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const query = q.trim()
    if (!query) return
    commitSearchNavigation(props.config, query)
  }

  return (
    <LensSurface
      tokens={props.tokens}
      shape="capsule"
      title={`搜索 · ${engineLabel}`}
      showTitle={props.showTitle}
    >
      <style>{`
        input[data-yindex-search-input="true"]::placeholder { color: var(--yindex-widget-muted-foreground); opacity: 1; }
        [data-widget-surface="lens"]:has(input[data-yindex-search-input="true"]:focus-visible) {
          box-shadow: inset 0 1px 0 color-mix(in oklch, white 45%, transparent), inset 0 0 0 1px color-mix(in oklch, white 18%, transparent), 0 16px 36px color-mix(in oklch, black 22%, transparent), 0 0 0 3px color-mix(in oklch, var(--yindex-widget-foreground) 22%, transparent);
        }
      `}</style>
      <form
        onSubmit={onSubmit}
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 6px 0 16px",
        }}
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ flex: "0 0 auto", color: "var(--yindex-widget-muted-foreground)" }}
        >
          <circle
            cx="7"
            cy="7"
            r="5.2"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M11 11l3.2 3.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <input
          data-yindex-search-input="true"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`用 ${engineLabel} 搜索…`}
          aria-label="搜索"
          autoComplete="off"
          spellCheck={false}
          style={field}
        />
      </form>
    </LensSurface>
  )
}
