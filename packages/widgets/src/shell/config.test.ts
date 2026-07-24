import { describe, expect, test } from "bun:test"
import { readShowTitle, withShowTitle } from "./config"

describe("showTitle config", () => {
  test("default true", () => {
    expect(readShowTitle(undefined)).toBe(true)
    expect(readShowTitle({})).toBe(true)
  })
  test("default false override", () => {
    expect(readShowTitle({}, false)).toBe(false)
  })
  test("explicit false", () => {
    expect(readShowTitle({ showTitle: false })).toBe(false)
  })
  test("explicit true", () => {
    expect(readShowTitle({ showTitle: true }, false)).toBe(true)
  })
  test("withShowTitle merges", () => {
    expect(withShowTitle({ engine: "google" }, false)).toEqual({
      engine: "google",
      showTitle: false,
    })
  })
})
