import type { StyleTokens } from "@yindex/domain"
import { useEffect, useState } from "react"
import { ContentDirectSurface } from "../shell/surface"

export type QuoteWidgetConfig = {
  readonly source: "hitokoto" | "static"
  readonly refreshHours?: number
}

export type QuoteWidgetProps = {
  readonly tokens: StyleTokens
  readonly config: QuoteWidgetConfig
  readonly showTitle?: boolean | undefined
}

type QuoteState =
  | { readonly status: "loading" }
  | { readonly status: "ok"; readonly text: string; readonly from: string }
  | { readonly status: "error"; readonly text: string; readonly from: string }

const FALLBACK = {
  text: "天行健，君子以自强不息。",
  from: "周易·乾",
} as const

const CACHE_KEY = "yindex.quote.cache"

export function QuoteWidget(props: QuoteWidgetProps) {
  const [state, setState] = useState<QuoteState>({ status: "loading" })
  const [force, setForce] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (props.config.source === "static") {
        setState({ status: "ok", text: FALLBACK.text, from: FALLBACK.from })
        return
      }
      try {
        const cachedRaw = force > 0 ? null : localStorage.getItem(CACHE_KEY)
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as {
            text: string
            from: string
            at: number
          }
          const hours = props.config.refreshHours ?? 24
          if (Date.now() - cached.at < hours * 3600_000) {
            if (!cancelled) {
              setState({ status: "ok", text: cached.text, from: cached.from })
            }
            return
          }
        }
        if (!cancelled) setState({ status: "loading" })
        const res = await fetch("https://v1.hitokoto.cn/?encode=json")
        if (!res.ok) throw new Error(`hitokoto ${res.status}`)
        const data = (await res.json()) as { hitokoto?: string; from?: string }
        const text = data.hitokoto ?? FALLBACK.text
        const from = data.from ?? "一言"
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ text, from, at: Date.now() }),
        )
        if (!cancelled) setState({ status: "ok", text, from })
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            text: FALLBACK.text,
            from: FALLBACK.from,
          })
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [props.config.refreshHours, props.config.source, force])

  const body =
    state.status === "loading"
      ? { text: "…", from: "" }
      : { text: state.text, from: state.from }

  const ink = props.tokens.glass.adaptive.contentDirect.foreground
  const muted = props.tokens.glass.adaptive.contentDirect.mutedForeground
  const scrim = props.tokens.glass.adaptive.contentDirect.scrim

  return (
    <ContentDirectSurface
      tokens={props.tokens}
      title="每日一句"
      showTitle={props.showTitle}
    >
      <blockquote
        style={{
          margin: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
          color: ink,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: props.tokens.typography.displayFamily,
            fontSize: "clamp(1.4rem, 3vw, 2.2rem)",
            lineHeight: 1.8,
            letterSpacing: "0.02em",
            fontWeight: 550,
            textShadow: `0 1px 24px ${scrim}`,
          }}
        >
          {body.text}
        </p>
        <footer
          style={{
            color: muted,
            fontSize: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            textShadow: `0 1px 24px ${scrim}`,
          }}
        >
          <span>{body.from ? `— ${body.from}` : "\u00a0"}</span>
          {props.config.source !== "static" ? (
            <button
              type="button"
              onClick={() => setForce((n) => n + 1)}
              style={{
                border: "none",
                background: "transparent",
                color: muted,
                cursor: "pointer",
                fontSize: 11,
                padding: 0,
                textDecoration: "underline",
              }}
            >
              换一句
            </button>
          ) : null}
        </footer>
      </blockquote>
    </ContentDirectSurface>
  )
}
