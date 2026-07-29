import { describe, expect, test } from "bun:test"
import {
  type HomeDocument,
  migrateHomeDocument,
  packageId,
  widgetTypeId,
} from "@yindex/domain"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../default/createDefaultHome"
import { pageTokensOf } from "./PageCanvas"
import { WidgetMount } from "./WidgetMount"
import {
  malformedShortcutsFixture,
  noWidgetConfig,
  replacePersistReload,
} from "./test/widgetMountConfigHarness"

describe("WidgetMount built-in config boundary", () => {
  test("Given imported Shortcuts config is an empty object, When the Widget mounts, Then it renders the safe empty state", () => {
    // Given
    const { doc, page, widget } = malformedShortcutsFixture()

    // When
    const markup = renderToStaticMarkup(
      createElement(WidgetMount, {
        doc,
        pageId: page.id,
        widget,
        pageTokens: pageTokensOf(page, null),
        editMode: false,
        reducedMotion: false,
        onWidgetConfig: noWidgetConfig,
      }),
    )

    // Then
    expect(markup).toContain("暂无快捷方式")
  })

  test("Given imported malformed Shortcuts config replaces Home, When persisted and reloaded, Then the mounted Widget renders its safe default", async () => {
    // Given
    const fixture = malformedShortcutsFixture()
    const imported = migrateHomeDocument({
      ...fixture.doc,
      pages: {
        ...fixture.doc.pages,
        [fixture.page.id]: {
          ...fixture.page,
          widgets: fixture.page.widgets.map((widget) =>
            widget.id === fixture.widget.id ? fixture.widget : widget,
          ),
        },
      },
    })
    if (!imported.ok) throw new Error(imported.error.message)

    // When
    const loaded = await replacePersistReload(imported.value)
    const loadedPage = loaded.pages[fixture.page.id]
    const loadedWidget = loadedPage?.widgets.find(
      (widget) => widget.id === fixture.widget.id,
    )
    if (loadedPage === undefined || loadedWidget === undefined) {
      throw new Error("persisted Shortcuts fixture is missing")
    }
    const markup = renderToStaticMarkup(
      createElement(WidgetMount, {
        doc: loaded,
        pageId: loadedPage.id,
        widget: loadedWidget,
        pageTokens: pageTokensOf(loadedPage, null),
        editMode: false,
        reducedMotion: false,
        onWidgetConfig: noWidgetConfig,
      }),
    )

    // Then
    expect(loadedWidget.config).toEqual({})
    expect(markup).toContain("暂无快捷方式")
  })

  test("Given imported Package and Missing Widgets contain opaque config, When replaced, persisted, reloaded, and mounted, Then every opaque value is preserved", async () => {
    // Given
    const doc = createDefaultHome()
    const pageId = doc.sequence.pageIds[0]
    const page = pageId === undefined ? undefined : doc.pages[pageId]
    const packageBase = page?.widgets[0]
    const missingBase = page?.widgets[1]
    if (
      page === undefined ||
      packageBase === undefined ||
      missingBase === undefined
    ) {
      throw new Error("default Home must contain two Widget fixtures")
    }
    const packageConfig = {
      nested: { colors: ["amber", "jade"] },
      enabled: false,
    }
    const missingConfig = { retained: [1, { deep: "value" }] }
    const savedConfig = { packageState: { count: 7, flags: [true, false] } }
    const replacement: HomeDocument = {
      ...doc,
      pages: {
        ...doc.pages,
        [page.id]: {
          ...page,
          widgets: [
            {
              ...packageBase,
              source: {
                kind: "package",
                packageId: packageId("opaque.package"),
                typeId: widgetTypeId("opaque.package.widget"),
                packageVersion: "3.2.1",
              },
              config: packageConfig,
            },
            {
              ...missingBase,
              source: {
                kind: "missing",
                packageId: packageId("missing.package"),
                typeId: widgetTypeId("missing.package.widget"),
                lastPackageVersion: "1.4.0",
                savedConfig,
              },
              config: missingConfig,
            },
          ],
        },
      },
    }
    const imported = migrateHomeDocument(replacement)
    if (!imported.ok) throw new Error(imported.error.message)

    // When
    const loaded = await replacePersistReload(imported.value)
    const loadedPage = loaded.pages[page.id]
    const packageWidget = loadedPage?.widgets[0]
    const missingWidget = loadedPage?.widgets[1]
    if (
      loadedPage === undefined ||
      packageWidget === undefined ||
      missingWidget === undefined ||
      missingWidget.source.kind !== "missing"
    ) {
      throw new Error("opaque Widget fixtures did not reload")
    }
    const packageMarkup = renderToStaticMarkup(
      createElement(WidgetMount, {
        doc: loaded,
        pageId: loadedPage.id,
        widget: packageWidget,
        pageTokens: pageTokensOf(loadedPage, null),
        editMode: false,
        reducedMotion: false,
        onWidgetConfig: noWidgetConfig,
      }),
    )
    const missingMarkup = renderToStaticMarkup(
      createElement(WidgetMount, {
        doc: loaded,
        pageId: loadedPage.id,
        widget: missingWidget,
        pageTokens: pageTokensOf(loadedPage, null),
        editMode: false,
        reducedMotion: false,
        onWidgetConfig: noWidgetConfig,
      }),
    )

    // Then
    expect(packageWidget.config).toEqual(packageConfig)
    expect(missingWidget.config).toEqual(missingConfig)
    expect(missingWidget.source.savedConfig).toEqual(savedConfig)
    expect(packageMarkup).toContain("Package 启动中")
    expect(missingMarkup).toContain("Package 未安装或类型不可用")
  })
})
