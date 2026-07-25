import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  buildHomeDocument,
  createBlankPage,
  createGenerativePageStyle,
  createWidgetInstance,
  markPackageMissing,
  packageId,
  restorePackageInstances,
  widgetTypeId,
  withZ,
} from "@yindex/domain"
import { packageManifestSchema } from "@yindex/widget-sdk"

const repositoryRoot = resolve(import.meta.dir, "../../../..")

function readText(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), "utf8")
}

function homeWithPackageWidget() {
  const style = createGenerativePageStyle({
    seedPalette: {
      bg: "oklch(0.18 0.02 250)",
      surface: "oklch(0.24 0.02 250)",
      ink: "oklch(0.96 0.01 250)",
      muted: "oklch(0.76 0.02 250)",
      accent: "oklch(0.68 0.1 220)",
    },
    generativePreset: "flow",
    glassProfile: "balanced",
  })
  if (!style.ok) throw new Error(style.error.message)
  const page = createBlankPage({ name: "Packages", style: style.value })
  const widget = createWidgetInstance({
    source: {
      kind: "package",
      packageId: packageId("com.example.pomodoro"),
      typeId: widgetTypeId("pomodoro.timer"),
      packageVersion: "1.0.0",
    },
    layout: withZ({ x: 12, y: 16, w: 24, h: 30 }, 7),
    config: { durationMinutes: 25 },
  })
  const result = buildHomeDocument({
    pages: [{ ...page, widgets: [widget] }],
  })
  if (!result.ok) throw new Error(result.error.message)
  return { doc: result.value, pageId: page.id, widget }
}

describe("Package Widget host integration", () => {
  test("restores a missing instance without changing config or layout", () => {
    // Given: an installed instance preserved after its Package is removed
    const { doc, pageId, widget } = homeWithPackageWidget()
    const missing = markPackageMissing(doc, "com.example.pomodoro")

    // When: the same Package identity is installed again
    const restored = restorePackageInstances(
      missing,
      "com.example.pomodoro",
      "1.1.0",
    )
    const restoredWidget = restored.pages[pageId]?.widgets[0]

    // Then: source becomes runnable while user-owned state is unchanged
    expect(restoredWidget?.source.kind).toBe("package")
    expect(restoredWidget?.config).toEqual(widget.config)
    expect(restoredWidget?.layout).toEqual(widget.layout)
    if (restoredWidget?.source.kind === "package") {
      expect(restoredWidget.source.packageVersion).toBe("1.1.0")
    }
  })

  test("declares only permissions used by the Pomodoro bridge", () => {
    // Given: the bundled third-party example Package
    const manifest = packageManifestSchema.parse(
      JSON.parse(readText("packages/examples/pomodoro/manifest.json")),
    )

    // When: its bridge permissions are inspected
    // Then: storage and completion notifications are granted, with no hosts
    expect(manifest.permissions).toEqual(["storage.instance", "notifications"])
    expect(manifest.hostPermissions).toEqual([])
  })

  test("inherits host foreground and reduced-motion state from host-init", () => {
    // Given: the bundled Package entry document
    const timer = readText("packages/examples/pomodoro/timer.html")

    // When: its machine-consumed host contract is inspected
    // Then: host-init drives foreground CSS variables and motion preference
    expect(timer).toContain('d.channel !== "yindex-host-init"')
    expect(timer).toContain('d.cssVars["--yindex-lens-ink"]')
    expect(timer).toContain("document.documentElement.style.setProperty")
    expect(timer).toContain("reducedMotion = d.reducedMotion")
  })
})
