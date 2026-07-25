import { describe, expect, test } from "bun:test"
import { createGenerativePageStyle, pageStyleToTokens } from "@yindex/domain"
import { packageHostInitMessageSchema } from "@yindex/widget-sdk"
import {
  PACKAGE_FRAME_SANDBOX,
  createHostInitMessage,
  isPackageFrameSource,
} from "./PackageWidgetFrame"

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

describe("Package Widget host contract", () => {
  test("builds the typed host-init payload with lens CSS variables", () => {
    // Given: host-owned theme, motion, size, and instance configuration
    const tokens = hostTokens()

    // When: the package initialization message is built
    const message = packageHostInitMessageSchema.parse(
      createHostInitMessage({
        instanceId: "widget-package-1",
        config: { durationMinutes: 25 },
        reducedMotion: true,
        size: { width: 320, height: 180 },
        tokens,
      }),
    )

    // Then: the isolated package receives only the typed host-owned contract
    expect(message).toEqual({
      channel: "yindex-host-init",
      instanceId: "widget-package-1",
      config: { durationMinutes: 25 },
      reducedMotion: true,
      size: { width: 320, height: 180 },
      cssVars: expect.objectContaining({
        "--yindex-lens-ink": tokens.glass.adaptive.lens.foreground,
        "--yindex-lens-muted-ink": tokens.glass.adaptive.lens.mutedForeground,
        "--yindex-accent": tokens.color.accent,
        "--yindex-font-body": tokens.typography.bodyFamily,
      }),
    })
  })

  test("accepts bridge messages only from its own isolated iframe", () => {
    // Given: one mounted package frame and an unrelated message source
    const ownFrame = new MessageChannel().port1
    const unrelatedFrame = new MessageChannel().port1

    // When: the host compares message sources
    // Then: only the mounted frame can reach its instance-scoped bridge
    expect(isPackageFrameSource(ownFrame, ownFrame)).toBe(true)
    expect(isPackageFrameSource(unrelatedFrame, ownFrame)).toBe(false)
    expect(isPackageFrameSource(null, ownFrame)).toBe(false)
  })

  test("keeps packages script-capable without granting same-origin access", () => {
    // Given: the direct package iframe sandbox policy
    const directives = PACKAGE_FRAME_SANDBOX.split(/\s+/)

    // When: its capabilities are inspected
    // Then: scripts work while the package remains on an opaque origin
    expect(directives).toContain("allow-scripts")
    expect(directives).not.toContain("allow-same-origin")
    expect(directives).not.toContain("allow-top-navigation")
  })
})
