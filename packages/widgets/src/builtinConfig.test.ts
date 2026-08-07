import { describe, expect, test } from "bun:test"
import { parseBuiltinWidgetConfig } from "./builtinConfig"

const malformedCases = [
  ["builtin.clock", null, { compact: false, showSeconds: true }],
  [
    "builtin.clock",
    { compact: "yes", showSeconds: false },
    { compact: false, showSeconds: true },
  ],
  ["builtin.search", [], { engine: "google" }],
  ["builtin.search", { engine: "ask" }, { engine: "google" }],
  ["builtin.shortcuts", "links", { items: [] }],
  ["builtin.shortcuts", { items: "links" }, { items: [] }],
  [
    "builtin.shortcuts",
    {
      items: [
        {
          id: "nested-folder",
          title: "嵌套",
          items: [{ id: "f", title: "内层", items: [] }],
        },
      ],
    },
    { items: [] },
  ],
  ["builtin.weather", false, { mode: "auto" }],
  ["builtin.weather", { mode: "gps" }, { mode: "auto" }],
  ["builtin.quote", 24, { source: "hitokoto" }],
  ["builtin.quote", { source: "remote" }, { source: "hitokoto" }],
  ["builtin.hexagram", "乾", {}],
  ["builtin.hexagram", { drawnIndex: "1" }, {}],
] as const

const validCases = [
  ["builtin.clock", { compact: true, showSeconds: false }],
  [
    "builtin.search",
    {
      engine: "custom",
      customUrl: "https://example.com/search?q=%s",
    },
  ],
  [
    "builtin.shortcuts",
    {
      items: [
        {
          id: "docs",
          title: "Docs",
          url: "https://example.com/docs",
          favicon: "https://example.com/favicon.ico",
        },
        {
          id: "work",
          title: "工作",
          items: [
            { id: "mail", title: "Mail", url: "https://mail.example.com" },
          ],
        },
      ],
    },
  ],
  [
    "builtin.weather",
    {
      mode: "manual",
      cityLabel: "成都",
      latitude: 30.67,
      longitude: 104.06,
    },
  ],
  ["builtin.quote", { source: "static", refreshHours: 6 }],
  [
    "builtin.hexagram",
    {
      drawnIndex: 12,
      drawnDate: "2026-07-28",
      notes: { "12": "天地不交" },
      dailyLog: { "2026-07-28": "12" },
    },
  ],
] as const

describe("parseBuiltinWidgetConfig", () => {
  test.each(malformedCases)(
    "Given %s receives malformed config, When parsed, Then its complete safe default is returned",
    (typeId, config, expected) => {
      // Given / When
      const parsed = parseBuiltinWidgetConfig({ typeId, config })

      // Then
      expect(parsed?.config).toEqual(expected)
    },
  )

  test.each(validCases)(
    "Given %s receives valid non-default config, When parsed, Then its semantics are preserved",
    (typeId, config) => {
      // Given / When
      const parsed = parseBuiltinWidgetConfig({ typeId, config })

      // Then
      expect(parsed?.config).toEqual(config)
    },
  )

  test("Given an unknown built-in type, When parsed, Then it remains unresolved for Missing Widget rendering", () => {
    // Given / When
    const parsed = parseBuiltinWidgetConfig({
      typeId: "builtin.future",
      config: { opaque: true },
    })

    // Then
    expect(parsed).toBeNull()
  })
})
