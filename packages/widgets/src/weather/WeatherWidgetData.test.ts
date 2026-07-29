import { describe, expect, test } from "bun:test"
import {
  type WeatherState,
  type WeatherWidgetConfig,
  loadWeather,
} from "./WeatherWidgetData"

const MANUAL_CONFIG = {
  mode: "manual",
  cityLabel: "杭州",
  latitude: 30.27,
  longitude: 120.15,
} as const satisfies WeatherWidgetConfig

const VALID_PAYLOAD = {
  current: {
    temperature_2m: 23.5,
    weather_code: 1,
    wind_speed_10m: 8,
  },
} as const

const INVALID_PAYLOAD_CASES = [
  {
    name: "temperature is missing",
    payload: { current: { weather_code: 1, wind_speed_10m: 8 } },
  },
  {
    name: "weather code is missing",
    payload: { current: { temperature_2m: 23.5, wind_speed_10m: 8 } },
  },
  {
    name: "wind speed is missing",
    payload: { current: { temperature_2m: 23.5, weather_code: 1 } },
  },
  {
    name: "temperature has the wrong type",
    payload: {
      current: { ...VALID_PAYLOAD.current, temperature_2m: "23.5" },
    },
  },
  {
    name: "weather code has the wrong type",
    payload: { current: { ...VALID_PAYLOAD.current, weather_code: "1" } },
  },
  {
    name: "wind speed has the wrong type",
    payload: { current: { ...VALID_PAYLOAD.current, wind_speed_10m: "8" } },
  },
  {
    name: "temperature is non-finite",
    payload: {
      current: { ...VALID_PAYLOAD.current, temperature_2m: Number.NaN },
    },
  },
  {
    name: "weather code is non-finite",
    payload: {
      current: {
        ...VALID_PAYLOAD.current,
        weather_code: Number.POSITIVE_INFINITY,
      },
    },
  },
  {
    name: "wind speed is non-finite",
    payload: {
      current: {
        ...VALID_PAYLOAD.current,
        wind_speed_10m: Number.NEGATIVE_INFINITY,
      },
    },
  },
  {
    name: "temperature is outside the Celsius safety envelope",
    payload: { current: { ...VALID_PAYLOAD.current, temperature_2m: 100.1 } },
  },
  {
    name: "weather code is outside the Open-Meteo WMO set",
    payload: { current: { ...VALID_PAYLOAD.current, weather_code: 4 } },
  },
  {
    name: "wind speed is outside the km/h safety envelope",
    payload: { current: { ...VALID_PAYLOAD.current, wind_speed_10m: -0.1 } },
  },
] as const

const VALID_BOUNDARY_CASES = [
  {
    name: "lower numeric boundaries",
    payload: {
      current: {
        temperature_2m: -100,
        weather_code: 0,
        wind_speed_10m: 0,
      },
    },
    expected: {
      status: "ok",
      tempC: -100,
      windKmh: 0,
      code: 0,
      label: "晴",
      locationLabel: "杭州",
    },
  },
  {
    name: "upper numeric boundaries",
    payload: {
      current: {
        temperature_2m: 100,
        weather_code: 99,
        wind_speed_10m: 500,
      },
    },
    expected: {
      status: "ok",
      tempC: 100,
      windKmh: 500,
      code: 99,
      label: "雷暴",
      locationLabel: "杭州",
    },
  },
] as const

type WeatherLoadProbe = {
  readonly state: WeatherState
  readonly jsonCalls: number
  readonly requestedUrl: string
}

function restoreGlobalProperty(
  name: "fetch" | "navigator",
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor === undefined) {
    Reflect.deleteProperty(globalThis, name)
    return
  }
  Object.defineProperty(globalThis, name, descriptor)
}

async function loadWithPayload(
  payload: unknown,
  config: WeatherWidgetConfig = MANUAL_CONFIG,
): Promise<WeatherLoadProbe> {
  const previousFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch")
  let jsonCalls = 0
  let requestedUrl = ""
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: (input: RequestInfo | URL) => {
      requestedUrl = String(input)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => {
          jsonCalls += 1
          return Promise.resolve(payload)
        },
      })
    },
  })

  try {
    return {
      state: await loadWeather(config),
      jsonCalls,
      requestedUrl,
    }
  } finally {
    restoreGlobalProperty("fetch", previousFetch)
  }
}

describe("Weather API runtime boundary", () => {
  for (const invalidCase of INVALID_PAYLOAD_CASES) {
    test(`Given ${invalidCase.name}, When Weather loads, Then invalid data never enters WeatherState`, async () => {
      // Given / When
      const probe = await loadWithPayload(invalidCase.payload)

      // Then
      expect(probe.state).toEqual({
        status: "error",
        message: "天气数据无效",
      })
    })
  }

  for (const boundaryCase of VALID_BOUNDARY_CASES) {
    test(`Given ${boundaryCase.name}, When Weather loads, Then the payload remains valid`, async () => {
      // Given / When
      const probe = await loadWithPayload(boundaryCase.payload)

      // Then
      expect(probe.state).toEqual(boundaryCase.expected)
    })
  }

  test("Given a valid payload, When Weather loads, Then JSON crosses the boundary exactly once", async () => {
    // Given / When
    const probe = await loadWithPayload(VALID_PAYLOAD)

    // Then
    expect(probe.jsonCalls).toBe(1)
  })

  test("Given denied geolocation, When auto Weather loads, Then Shanghai fallback remains truthful", async () => {
    // Given
    const previousNavigator = Object.getOwnPropertyDescriptor(
      globalThis,
      "navigator",
    )
    const deniedError = {
      code: 1,
      message: "permission denied",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as const satisfies GeolocationPositionError
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        geolocation: {
          getCurrentPosition: (
            _success: PositionCallback,
            failure: PositionErrorCallback | null,
          ) => failure?.(deniedError),
        },
      },
    })

    try {
      // When
      const probe = await loadWithPayload(VALID_PAYLOAD, {
        mode: "auto",
        cityLabel: "北京",
      })

      // Then
      expect(probe.state).toMatchObject({
        status: "ok",
        locationLabel: "上海（定位失败）",
      })
      const requestedUrl = new URL(probe.requestedUrl)
      expect(requestedUrl.searchParams.get("latitude")).toBe("31.23")
      expect(requestedUrl.searchParams.get("longitude")).toBe("121.47")
    } finally {
      restoreGlobalProperty("navigator", previousNavigator)
    }
  })
})
