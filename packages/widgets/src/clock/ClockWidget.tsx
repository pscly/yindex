import type { StyleTokens } from "@yindex/domain"
import { useEffect, useState } from "react"
import { ContentDirectSurface } from "../shell/surface"

export type ClockWidgetProps = {
  readonly tokens: StyleTokens
  readonly compact?: boolean
  readonly showSeconds?: boolean
  readonly showTitle?: boolean | undefined
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"] as const

export function ClockWidget(props: ClockWidgetProps) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const ms = props.showSeconds === false ? 15_000 : 1000
    const id = window.setInterval(() => setNow(new Date()), ms)
    return () => window.clearInterval(id)
  }, [props.showSeconds])

  const h = pad(now.getHours())
  const m = pad(now.getMinutes())
  const s = pad(now.getSeconds())
  const date = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
  const week = `星期${WEEKDAYS[now.getDay()] ?? ""}`
  const time = props.showSeconds === false ? `${h}:${m}` : `${h}:${m}:${s}`
  const ink = props.tokens.glass.adaptive.contentDirect.foreground
  const muted = props.tokens.glass.adaptive.contentDirect.mutedForeground
  const scrim = props.tokens.glass.adaptive.contentDirect.scrim
  const displayWeight = Math.min(
    200,
    Math.max(100, props.tokens.typography.displayWeight),
  )

  return (
    <ContentDirectSurface
      tokens={props.tokens}
      title="时钟"
      showTitle={props.showTitle === true}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: props.compact ? 2 : 14,
          textAlign: "center",
          userSelect: "none",
          color: ink,
        }}
      >
        <div
          style={{
            fontFamily: props.tokens.typography.displayFamily,
            fontWeight: displayWeight,
            fontSize: props.compact
              ? "clamp(1.75rem, 8vw, 2rem)"
              : "clamp(4.5rem, 14vw, 9rem)",
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 1px 24px ${scrim}`,
          }}
          aria-live="polite"
          aria-label={`当前时间 ${time}`}
        >
          {time}
        </div>
        <div
          style={{
            color: muted,
            fontSize: props.compact
              ? "clamp(11px, 1.2vw, 12px)"
              : "clamp(13px, 1.4vw, 16px)",
            letterSpacing: "0.06em",
            fontWeight: 400,
            lineHeight: props.compact ? 1.2 : undefined,
            whiteSpace: props.compact ? "nowrap" : undefined,
            textShadow: `0 1px 24px ${scrim}`,
          }}
        >
          {date} · {week}
        </div>
      </div>
    </ContentDirectSurface>
  )
}
