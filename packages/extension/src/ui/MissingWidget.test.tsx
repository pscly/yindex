import { describe, expect, test } from "bun:test"
import { createGenerativePageStyle, pageStyleToTokens } from "@yindex/domain"
import { renderToStaticMarkup } from "react-dom/server"
import { MissingWidget } from "./MissingWidget"

function hostTokens() {
  const style = createGenerativePageStyle({
    seedPalette: {
      bg: "oklch(0.18 0.02 250)",
      surface: "opaque-host-surface",
      ink: "oklch(0.96 0.01 250)",
      muted: "oklch(0.76 0.02 250)",
      accent: "oklch(0.68 0.1 220)",
    },
    generativePreset: "flow",
    glassProfile: "balanced",
  })
  if (!style.ok) throw new Error(style.error.message)
  return pageStyleToTokens(style.value, {
    luminance: 0.14,
    chroma: 0.07,
    detail: 0.05,
  })
}

describe("Missing Widget host surface", () => {
  test("renders the restorable placeholder on the host panel lens", () => {
    // Given: a preserved instance whose Package is currently missing
    const tokens = hostTokens()

    // When: the host renders its placeholder
    const html = renderToStaticMarkup(
      <MissingWidget
        tokens={tokens}
        packageId="com.example.pomodoro"
        typeId="pomodoro.timer"
      />,
    )

    // Then: host Living Glass owns the panel and restore identity remains visible
    expect(html).toContain('data-widget-surface="lens"')
    expect(html).toContain('data-lens-shape="panel"')
    expect(html).toContain("com.example.pomodoro")
    expect(html).toContain("pomodoro.timer")
    expect(html).toContain("重装同一 Package 后可恢复配置与布局")
    expect(html).not.toContain("opaque-host-surface")
  })

  test("keeps the Missing Widget status visible when Widget titles are hidden", () => {
    const html = renderToStaticMarkup(
      <MissingWidget
        tokens={hostTokens()}
        packageId="com.example.pomodoro"
        typeId="pomodoro.timer"
        showTitle={false}
      />,
    )

    expect(html).toContain("Package 未安装或类型不可用")
    expect(html).toContain("com.example.pomodoro")
  })
})
