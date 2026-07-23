import { useEffect, useState } from "react"
import type { StyleTokens } from "@yindex/domain"
import { WidgetSurface } from "../shell/surface"

export type ClockWidgetProps = {
  readonly tokens: StyleTokens
  readonly showSeconds?: boolean
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"] as const

export function ClockWidget(props: ClockWidgetProps) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const h = pad(now.getHours())
  const m = pad(now.getMinutes())
  const s = pad(now.getSeconds())
  const date = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
  const week = `星期${WEEKDAYS[now.getDay()] ?? ""}`
  const time = props.showSeconds === false ? `${h}:${m}` : `${h}:${m}:${s}`

  return (
    <WidgetSurface tokens={props.tokens}>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: props.tokens.typography.displayFamily,
            fontWeight: props.tokens.typography.displayWeight,
            fontSize: "clamp(2.4rem, 8vw, 5.5rem)",
            letterSpacing: "0.04em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {time}
        </div>
        <div style={{ color: props.tokens.color.muted, fontSize: 14 }}>
          {date} · {week}
        </div>
      </div>
    </WidgetSurface>
  )
}
