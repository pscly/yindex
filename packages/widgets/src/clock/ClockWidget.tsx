import { useEffect, useState } from "react"
import type { StyleTokens } from "@yindex/domain"
import { WidgetSurface } from "../shell/surface"

export type ClockWidgetProps = {
  readonly tokens: StyleTokens
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
  const glass = props.tokens.glass.enabled

  const surfaceProps = !glass
    ? {
        style: {
          background: "transparent",
          border: "none",
          boxShadow: "none" as const,
        },
      }
    : {}

  return (
    <WidgetSurface
      tokens={props.tokens}
      title="时钟"
      showTitle={props.showTitle === true}
      {...surfaceProps}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          textAlign: "center",
          userSelect: "none",
        }}
      >
        <div
          style={{
            fontFamily: props.tokens.typography.displayFamily,
            fontWeight: props.tokens.typography.displayWeight,
            fontSize: "clamp(3rem, 11vw, 7rem)",
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            fontVariantNumeric: "tabular-nums",
            textShadow: glass
              ? "0 0 40px color-mix(in oklch, white 18%, transparent)"
              : undefined,
          }}
          aria-live="polite"
          aria-label={`当前时间 ${time}`}
        >
          {time}
        </div>
        <div
          style={{
            color: props.tokens.color.muted,
            fontSize: "clamp(13px, 1.4vw, 16px)",
            letterSpacing: "0.06em",
            fontWeight: 400,
          }}
        >
          {date} · {week}
        </div>
      </div>
    </WidgetSurface>
  )
}
