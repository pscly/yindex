import { useEffect, useState } from "react"
import type { StyleTokens } from "@yindex/domain"
import { WidgetSurface } from "../shell/surface"

export type QuoteWidgetConfig = {
  readonly source: "hitokoto" | "static"
  readonly refreshHours?: number
}

export type QuoteWidgetProps = {
  readonly tokens: StyleTokens
  readonly config: QuoteWidgetConfig
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

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (props.config.source === "static") {
        setState({ status: "ok", text: FALLBACK.text, from: FALLBACK.from })
        return
      }
      try {
        const cachedRaw = localStorage.getItem(CACHE_KEY)
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
  }, [props.config.refreshHours, props.config.source])

  const body =
    state.status === "loading"
      ? { text: "…", from: "" }
      : { text: state.text, from: state.from }

  return (
    <WidgetSurface tokens={props.tokens} title="每日一句">
      <blockquote
        style={{
          margin: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: props.tokens.typography.displayFamily,
            fontSize: "clamp(1rem, 2.2vw, 1.35rem)",
            lineHeight: 1.6,
          }}
        >
          {body.text}
        </p>
        {body.from ? (
          <footer style={{ color: props.tokens.color.muted, fontSize: 12 }}>
            — {body.from}
          </footer>
        ) : null}
      </blockquote>
    </WidgetSurface>
  )
}
