import type { StyleTokens } from "@yindex/domain"
import { type CSSProperties, useEffect, useState } from "react"
import { WidgetSurface } from "../shell/surface"

export type WeatherWidgetConfig = {
  readonly mode: "auto" | "manual"
  readonly cityLabel?: string
  readonly latitude?: number
  readonly longitude?: number
}

export type WeatherWidgetProps = {
  readonly tokens: StyleTokens
  readonly config: WeatherWidgetConfig
  readonly showTitle?: boolean | undefined
}

type WeatherState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "ok"
      readonly tempC: number
      readonly windKmh: number
      readonly code: number
      readonly label: string
    }

function weatherLabel(code: number): string {
  if (code === 0) return "晴"
  if (code <= 3) return "多云"
  if (code <= 48) return "雾"
  if (code <= 67) return "雨"
  if (code <= 77) return "雪"
  if (code <= 82) return "阵雨"
  if (code <= 99) return "雷暴"
  return "—"
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherState> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`
  const res = await fetch(url)
  if (!res.ok) {
    return { status: "error", message: `天气请求失败 (${res.status})` }
  }
  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number
      weather_code?: number
      wind_speed_10m?: number
    }
  }
  const temp = data.current?.temperature_2m
  const code = data.current?.weather_code ?? 0
  const wind = data.current?.wind_speed_10m ?? 0
  if (typeof temp !== "number") {
    return { status: "error", message: "天气数据无效" }
  }
  return {
    status: "ok",
    tempC: temp,
    windKmh: wind,
    code,
    label: weatherLabel(code),
  }
}

function smallBtn(tokens: StyleTokens): CSSProperties {
  return {
    border: `1px solid color-mix(in oklch, ${tokens.color.ink} 16%, transparent)`,
    background: "transparent",
    color: tokens.color.ink,
    borderRadius: tokens.radius.sm,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  }
}

export function WeatherWidget(props: WeatherWidgetProps) {
  const [state, setState] = useState<WeatherState>({ status: "loading" })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    void tick
    let cancelled = false

    async function run() {
      if (!cancelled) setState({ status: "loading" })
      try {
        let lat = props.config.latitude
        let lon = props.config.longitude
        const needGeo =
          props.config.mode === "auto" || lat === undefined || lon === undefined
        if (needGeo) {
          lat = 31.23
          lon = 121.47
          if (typeof navigator !== "undefined" && navigator.geolocation) {
            const pos = await new Promise<GeolocationPosition | null>(
              (resolve) => {
                navigator.geolocation.getCurrentPosition(
                  (p) => resolve(p),
                  () => resolve(null),
                  { timeout: 5000, maximumAge: 600_000 },
                )
              },
            )
            if (pos) {
              lat = pos.coords.latitude
              lon = pos.coords.longitude
            }
          }
        }
        const result = await fetchWeather(lat as number, lon as number)
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
  }, [props.config.latitude, props.config.longitude, props.config.mode, tick])

  return (
    <WidgetSurface
      tokens={props.tokens}
      title="天气"
      showTitle={props.showTitle}
    >
      {state.status === "loading" ? (
        <div style={{ color: props.tokens.color.muted }}>加载中…</div>
      ) : null}
      {state.status === "error" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: props.tokens.color.muted, fontSize: 13 }}>
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
            gap: 4,
            height: "100%",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: props.tokens.typography.displayFamily,
              fontSize: "clamp(1.6rem, 4vw, 2rem)",
              fontWeight: props.tokens.typography.displayWeight,
              lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(state.tempC)}°
          </div>
          <div>
            {state.label}
            {props.config.cityLabel ? ` · ${props.config.cityLabel}` : ""}
          </div>
          <div
            style={{
              color: props.tokens.color.muted,
              fontSize: 12,
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span>风速 {Math.round(state.windKmh)} km/h</span>
            <button
              type="button"
              onClick={() => setTick((t) => t + 1)}
              style={{
                border: "none",
                background: "transparent",
                color: props.tokens.color.muted,
                cursor: "pointer",
                fontSize: 11,
                padding: 0,
                textDecoration: "underline",
              }}
            >
              刷新
            </button>
          </div>
        </div>
      ) : null}
    </WidgetSurface>
  )
}
