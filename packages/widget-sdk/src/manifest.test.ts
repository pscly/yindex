import { describe, expect, test } from "bun:test"
import { authorizeMethod } from "./bridge"
import {
  YINDEX_API_VERSION,
  parsePackageManifest,
  satisfiesEngine,
} from "./manifest"

describe("package manifest", () => {
  test("accepts valid pomodoro-like manifest", () => {
    const r = parsePackageManifest({
      packageId: "com.example.pomodoro",
      name: "番茄钟",
      version: "1.0.0",
      engines: { yindex: ">=1 <2" },
      yindexApiVersion: YINDEX_API_VERSION,
      types: [
        {
          typeId: "pomodoro.timer",
          name: "专注计时",
          entry: "timer.html",
          defaultSize: { w: 24, h: 28 },
        },
      ],
      permissions: ["storage.instance"],
      hostPermissions: [],
    })
    expect(r.ok).toBe(true)
  })

  test("rejects wrong api version", () => {
    const r = parsePackageManifest({
      packageId: "x",
      name: "x",
      version: "1.0.0",
      engines: { yindex: ">=1 <2" },
      yindexApiVersion: 99,
      types: [{ typeId: "t", name: "t", entry: "i.html" }],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe("api")
  })

  test("engine range", () => {
    expect(satisfiesEngine(">=1 <2", 1)).toBe(true)
    expect(satisfiesEngine(">=1 <2", 2)).toBe(false)
    expect(satisfiesEngine("^1", 1)).toBe(true)
  })

  test("bridge auth", () => {
    const denied = authorizeMethod("storage.get", [])
    expect(denied.ok).toBe(false)
    const ok = authorizeMethod("storage.get", ["storage.instance"])
    expect(ok.ok).toBe(true)
    const free = authorizeMethod("clock.now", [])
    expect(free.ok).toBe(true)
  })
})
