import type { StyleTokens } from "@yindex/domain"
import { type CSSProperties, useEffect, useState } from "react"
import { LensSurface } from "../shell/surface"
import {
  type WeatherState,
  type WeatherWidgetConfig,
  loadWeather,
} from "./WeatherWidgetData"

export { weatherLocationLabel } from "./WeatherWidgetData"
export type { WeatherWidgetConfig }

export type WeatherWidgetProps = {
  readonly tokens: StyleTokens
  readonly config: WeatherWidgetConfig
  readonly showTitle?: boolean | undefined
}

function smallBtn(tokens: StyleTokens): CSSProperties {
  return {
    border:
      "1px solid color-mix(in oklch, var(--yindex-widget-foreground) 16%, transparent)",
    background: "transparent",
    color: "var(--yindex-widget-foreground)",
    borderRadius: tokens.radius.sm,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  }
}

export function WeatherWidget(props: WeatherWidgetProps) {
  const [state, setState] = useState<WeatherState>({ status: "loading" })
  const [tick, setTick] = useState(0)
  const { cityLabel, latitude, longitude, mode } = props.config

  useEffect(() => {
    void tick
    let cancelled = false

    async function run() {
      if (!cancelled) setState({ status: "loading" })
      try {
        const result = await loadWeather({
          mode,
          ...(cityLabel === undefined ? {} : { cityLabel }),
          ...(latitude === undefined ? {} : { latitude }),
          ...(longitude === undefined ? {} : { longitude }),
        })
        if (!cancelled) setState(result)
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "天气加载失败",
          })
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [cityLabel, latitude, longitude, mode, tick])

  return (
    <LensSurface
      tokens={props.tokens}
      shape="capsule"
      title="天气"
      showTitle={props.showTitle}
    >
      {state.status === "loading" ? (
        <div style={{ color: "var(--yindex-widget-muted-foreground)" }}>
          加载中…
        </div>
      ) : null}
      {state.status === "error" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              color: "var(--yindex-widget-muted-foreground)",
              fontSize: 13,
            }}
          >
            {state.message}
          </div>
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            style={smallBtn(props.tokens)}
          >
            重试
          </button>
        </div>
      ) : null}
      {state.status === "ok" ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            height: "100%",
            justifyContent: "center",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontFamily: props.tokens.typography.monoFamily,
              fontSize: "clamp(1.25rem, 2.6vw, 1.55rem)",
              fontWeight: props.tokens.typography.displayWeight,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              color: "var(--yindex-widget-foreground)",
              flex: "0 0 auto",
            }}
          >
            {Math.round(state.tempC)}°
          </div>
          <div
            style={{
              color: "var(--yindex-widget-foreground)",
              fontSize: 13,
              lineHeight: 1.15,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            {state.label}
            {state.locationLabel ? ` · ${state.locationLabel}` : ""}
          </div>
          <div
            style={{
              color: "var(--yindex-widget-muted-foreground)",
              fontSize: 11,
              lineHeight: 1.15,
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
              minWidth: 0,
              flex: "0 0 auto",
              // Keep secondary row clear of capsule endcaps (overflow:hidden clips mid-glyph there).
              paddingInline: 6,
            }}
          >
            <span
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              风速 {Math.round(state.windKmh)} km/h
            </span>
            <button
              type="button"
              onClick={() => setTick((t) => t + 1)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--yindex-widget-muted-foreground)",
                cursor: "pointer",
                fontSize: 10,
                padding: 0,
                textDecoration: "underline",
                flex: "0 0 auto",
              }}
            >
              刷新
            </button>
          </div>
        </div>
      ) : null}
    </LensSurface>
  )
}
