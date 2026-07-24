import type { HomeDocument, PageId, StyleTokens, WidgetInstance } from "@yindex/domain"
import { resolveWidgetTokens } from "@yindex/domain"
import {
  ClockWidget,
  HexagramBoard,
  QuoteWidget,
  SearchWidget,
  ShortcutsWidget,
  WeatherWidget,
  readShowTitle,
  type SearchWidgetConfig,
  type ShortcutsWidgetConfig,
  type WeatherWidgetConfig,
  type QuoteWidgetConfig,
  type HexagramBoardConfig,
} from "@yindex/widgets"
import { PackageWidgetFrame } from "./PackageWidgetFrame"
import { MissingWidget } from "./MissingWidget"

export type WidgetMountProps = {
  readonly doc: HomeDocument
  readonly pageId: PageId
  readonly widget: WidgetInstance
  readonly pageTokens: StyleTokens
  readonly editMode: boolean
  readonly onWidgetConfig: (widgetId: string, config: unknown) => void
}

function asObject(config: unknown): Record<string, unknown> {
  if (typeof config === "object" && config !== null) {
    return config as Record<string, unknown>
  }
  return {}
}

export function WidgetMount(props: WidgetMountProps) {
  const tokens = resolveWidgetTokens(props.pageTokens, props.widget.styleOverride)
  const src = props.widget.source
  const allowRedraw = props.doc.settings.allowHexagramRedraw
  const cfg = asObject(props.widget.config)
  // Default: show titles for labeled widgets; clock defaults off (clean display)
  const showTitleDefault = src.kind === "builtin" && src.typeId === "builtin.clock" ? false : true
  const showTitle = readShowTitle(props.widget.config, showTitleDefault)

  if (src.kind === "missing") {
    return (
      <MissingWidget
        tokens={tokens}
        packageId={src.packageId}
        typeId={src.typeId}
        showTitle={showTitle}
      />
    )
  }

  if (src.kind === "package") {
    return (
      <PackageWidgetFrame
        tokens={tokens}
        packageId={src.packageId}
        typeId={src.typeId}
        instanceId={props.widget.id}
        config={props.widget.config}
      />
    )
  }

  const typeId = src.typeId
  switch (typeId) {
    case "builtin.clock":
      return (
        <ClockWidget
          tokens={tokens}
          showSeconds={
            "showSeconds" in cfg ? Boolean(cfg["showSeconds"]) : true
          }
          showTitle={showTitle}
        />
      )
    case "builtin.search":
      return (
        <SearchWidget
          tokens={tokens}
          config={(props.widget.config as SearchWidgetConfig) ?? { engine: "google" }}
          showTitle={showTitle}
        />
      )
    case "builtin.shortcuts":
      return (
        <ShortcutsWidget
          tokens={tokens}
          config={
            (props.widget.config as ShortcutsWidgetConfig) ?? { items: [] }
          }
          showTitle={showTitle}
        />
      )
    case "builtin.weather":
      return (
        <WeatherWidget
          tokens={tokens}
          config={(props.widget.config as WeatherWidgetConfig) ?? { mode: "auto" }}
          showTitle={showTitle}
        />
      )
    case "builtin.quote":
      return (
        <QuoteWidget
          tokens={tokens}
          config={(props.widget.config as QuoteWidgetConfig) ?? { source: "hitokoto" }}
          showTitle={showTitle}
        />
      )
    case "builtin.hexagram":
      return (
        <div data-scrollable="true" style={{ width: "100%", height: "100%" }}>
          <HexagramBoard
            tokens={tokens}
            config={(props.widget.config as HexagramBoardConfig) ?? {}}
            allowRedraw={allowRedraw}
            showTitle={showTitle}
            onConfigChange={(next) =>
              props.onWidgetConfig(props.widget.id, {
                ...asObject(next),
                showTitle,
              })
            }
          />
        </div>
      )
    default:
      return (
        <MissingWidget
          tokens={tokens}
          packageId="builtin"
          typeId={String(typeId)}
          showTitle={showTitle}
        />
      )
  }
}
