export type WeatherWidgetConfig = {
  readonly mode: "auto" | "manual"
  readonly cityLabel?: string
  readonly latitude?: number
  readonly longitude?: number
}

export type WeatherState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "ok"
      readonly tempC: number
      readonly windKmh: number
      readonly code: number
      readonly label: string
      readonly locationLabel: string
    }

type WeatherRequest = {
  readonly latitude: number
  readonly longitude: number
  readonly locationLabel: string
}

type WeatherReading = {
  readonly temperatureC: number
  readonly weatherCode: number
  readonly windSpeedKmh: number
}

type NumericRange = {
  readonly minimum: number
  readonly maximum: number
}

const TEMPERATURE_C_RANGE = {
  minimum: -100,
  maximum: 100,
} satisfies NumericRange

const WIND_SPEED_KMH_RANGE = {
  minimum: 0,
  maximum: 500,
} satisfies NumericRange

const OPEN_METEO_WEATHER_CODES: readonly number[] = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77,
  80, 81, 82, 85, 86, 95, 96, 99,
]

const SHANGHAI_FALLBACK = {
  latitude: 31.23,
  longitude: 121.47,
  label: "上海（定位失败）",
} as const

function isNumberInRange(value: unknown, range: NumericRange): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= range.minimum &&
    value <= range.maximum
  )
}

function decodeWeatherReading(payload: unknown): WeatherReading | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("current" in payload)
  ) {
    return null
  }

  const current = payload.current
  if (
    typeof current !== "object" ||
    current === null ||
    !("temperature_2m" in current) ||
    !("weather_code" in current) ||
    !("wind_speed_10m" in current)
  ) {
    return null
  }

  const temperature = current.temperature_2m
  const code = current.weather_code
  const wind = current.wind_speed_10m
  if (
    !isNumberInRange(temperature, TEMPERATURE_C_RANGE) ||
    typeof code !== "number" ||
    !Number.isFinite(code) ||
    !Number.isInteger(code) ||
    !OPEN_METEO_WEATHER_CODES.includes(code) ||
    !isNumberInRange(wind, WIND_SPEED_KMH_RANGE)
  ) {
    return null
  }

  return {
    temperatureC: temperature,
    weatherCode: code,
    windSpeedKmh: wind,
  }
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

export function weatherLocationLabel(
  cityLabel: string | undefined,
  usedShanghaiFallback: boolean,
): string {
  return usedShanghaiFallback
    ? SHANGHAI_FALLBACK.label
    : (cityLabel?.trim() ?? "")
}

async function requestFor(
  config: WeatherWidgetConfig,
): Promise<WeatherRequest> {
  let latitude = config.latitude ?? SHANGHAI_FALLBACK.latitude
  let longitude = config.longitude ?? SHANGHAI_FALLBACK.longitude
  const needGeo =
    config.mode === "auto" ||
    config.latitude === undefined ||
    config.longitude === undefined
  let usedShanghaiFallback = needGeo

  if (needGeo) {
    latitude = SHANGHAI_FALLBACK.latitude
    longitude = SHANGHAI_FALLBACK.longitude
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      const position = await new Promise<GeolocationPosition | null>(
        (resolve) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            () => resolve(null),
            { timeout: 5000, maximumAge: 600_000 },
          )
        },
      )
      if (position) {
        latitude = position.coords.latitude
        longitude = position.coords.longitude
        usedShanghaiFallback = false
      }
    }
  }

  return {
    latitude,
    longitude,
    locationLabel: weatherLocationLabel(config.cityLabel, usedShanghaiFallback),
  }
}

async function fetchWeather(request: WeatherRequest): Promise<WeatherState> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${request.latitude}&longitude=${request.longitude}&current=temperature_2m,weather_code,wind_speed_10m`
  const response = await fetch(url)
  if (!response.ok) {
    return { status: "error", message: `天气请求失败 (${response.status})` }
  }
  const payload: unknown = await response.json()
  const reading = decodeWeatherReading(payload)
  if (reading === null) {
    return { status: "error", message: "天气数据无效" }
  }
  return {
    status: "ok",
    tempC: reading.temperatureC,
    windKmh: reading.windSpeedKmh,
    code: reading.weatherCode,
    label: weatherLabel(reading.weatherCode),
    locationLabel: request.locationLabel,
  }
}

export async function loadWeather(
  config: WeatherWidgetConfig,
): Promise<WeatherState> {
  return fetchWeather(await requestFor(config))
}
