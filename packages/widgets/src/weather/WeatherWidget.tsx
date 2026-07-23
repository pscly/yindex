import { useEffect, useState } from "react"
import type { StyleTokens } from "@yindex/domain"
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

export function WeatherWidget(props: WeatherWidgetProps) {
  const [state, setState] = useState<WeatherState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        let lat = props.config.latitude
        let lon = props.config.longitude
        if (props.config.mode === "auto" || lat === undefined || lon === undefined) {
          // Default: Shanghai if geolocation unavailable
          lat = 31.23
          lon = 121.47
          if (typeof navigator !== "undefined" && navigator.geolocation) {
            const pos = await new Promise<GeolocationPosition | null>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                (p) => resolve(p),
                () => resolve(null),
                { timeout: 4000 },
              )
            })
            if (pos) {
              lat = pos.coords.latitude
              lon = pos.coords.longitude
            }
          }
        }
        const result = await fetchWeather(lat, lon)
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
  }, [props.config.latitude, props.config.longitude, props.config.mode])

  return (
    <WidgetSurface tokens={props.tokens} title="天气">
      {state.status === "loading" ? (
        <div style={{ color: props.tokens.color.muted }}>加载中…</div>
      ) : null}
      {state.status === "error" ? (
        <div style={{ color: props.tokens.color.muted }}>{state.message}</div>
      ) : null}
      {state.status === "ok" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontFamily: props.tokens.typography.displayFamily,
              fontSize: 28,
              fontWeight: props.tokens.typography.displayWeight,
            }}
          >
            {Math.round(state.tempC)}°
          </div>
          <div>
            {state.label}
            {props.config.cityLabel ? ` · ${props.config.cityLabel}` : ""}
          </div>
          <div style={{ color: props.tokens.color.muted, fontSize: 12 }}>
            风速 {Math.round(state.windKmh)} km/h · Open-Meteo
          </div>
        </div>
      ) : null}
    </WidgetSurface>
  )
}
