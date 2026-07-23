import type { HomeDocument, PageId, StyleTokens, WidgetInstance } from "@yindex/domain"
import { resolveWidgetTokens } from "@yindex/domain"
import {
  ClockWidget,
  HexagramBoard,
  QuoteWidget,
  SearchWidget,
  ShortcutsWidget,
  WeatherWidget,
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

export function WidgetMount(props: WidgetMountProps) {
  const tokens = resolveWidgetTokens(props.pageTokens, props.widget.styleOverride)
  const src = props.widget.source
  const allowRedraw = props.doc.settings.allowHexagramRedraw

  if (src.kind === "missing") {
    return <MissingWidget tokens={tokens} packageId={src.packageId} typeId={src.typeId} />
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
            typeof props.widget.config === "object" &&
            props.widget.config !== null &&
            "showSeconds" in props.widget.config
              ? Boolean((props.widget.config as { showSeconds?: boolean }).showSeconds)
              : true
          }
        />
      )
    case "builtin.search":
      return (
        <SearchWidget
          tokens={tokens}
          config={(props.widget.config as SearchWidgetConfig) ?? { engine: "google" }}
        />
      )
    case "builtin.shortcuts":
      return (
        <ShortcutsWidget
          tokens={tokens}
          config={
            (props.widget.config as ShortcutsWidgetConfig) ?? { items: [] }
          }
        />
      )
    case "builtin.weather":
      return (
        <WeatherWidget
          tokens={tokens}
          config={(props.widget.config as WeatherWidgetConfig) ?? { mode: "auto" }}
        />
      )
    case "builtin.quote":
      return (
        <QuoteWidget
          tokens={tokens}
          config={(props.widget.config as QuoteWidgetConfig) ?? { source: "hitokoto" }}
        />
      )
    case "builtin.hexagram":
      return (
        <div data-scrollable="true" style={{ width: "100%", height: "100%" }}>
          <HexagramBoard
            tokens={tokens}
            config={(props.widget.config as HexagramBoardConfig) ?? {}}
            allowRedraw={allowRedraw}
            onConfigChange={(next) => props.onWidgetConfig(props.widget.id, next)}
          />
        </div>
      )
    default:
      return (
        <MissingWidget tokens={tokens} packageId="builtin" typeId={String(typeId)} />
      )
  }
}
