import type {
  HomeDocument,
  PageId,
  StyleTokens,
  WidgetInstance,
} from "@yindex/domain"
import { assertNever, resolveWidgetTokens } from "@yindex/domain"
import {
  ClockWidget,
  HexagramBoard,
  QuoteWidget,
  SearchWidget,
  ShortcutsWidget,
  WeatherWidget,
  parseBuiltinWidgetConfig,
} from "@yindex/widgets"
import { MissingWidget } from "./MissingWidget"
import { PackageWidgetFrame } from "./PackageWidgetFrame"
import { WidgetErrorBoundary } from "./WidgetErrorBoundary"

export type WidgetMountProps = {
  readonly doc: HomeDocument
  readonly pageId: PageId
  readonly widget: WidgetInstance
  readonly pageTokens: StyleTokens
  readonly editMode: boolean
  readonly reducedMotion: boolean
  readonly onWidgetConfig: (widgetId: string, config: unknown) => void
}

export function WidgetMount(props: WidgetMountProps) {
  const tokens = resolveWidgetTokens(
    props.pageTokens,
    props.widget.styleOverride,
  )
  return (
    <WidgetErrorBoundary resetValue={props.widget} tokens={tokens}>
      <WidgetContent {...props} tokens={tokens} />
    </WidgetErrorBoundary>
  )
}

function WidgetContent(
  props: WidgetMountProps & { readonly tokens: StyleTokens },
) {
  const src = props.widget.source
  const allowRedraw = props.doc.settings.allowHexagramRedraw
  const showTitle = props.doc.settings.showWidgetTitles !== false

  if (src.kind === "missing") {
    return (
      <MissingWidget
        tokens={props.tokens}
        packageId={src.packageId}
        typeId={src.typeId}
        showTitle={showTitle}
      />
    )
  }

  if (src.kind === "package") {
    return (
      <PackageWidgetFrame
        tokens={props.tokens}
        packageId={src.packageId}
        typeId={src.typeId}
        instanceId={props.widget.id}
        config={props.widget.config}
        reducedMotion={props.reducedMotion}
      />
    )
  }

  const parsed = parseBuiltinWidgetConfig({
    typeId: src.typeId,
    config: props.widget.config,
  })
  if (parsed === null) {
    return (
      <MissingWidget
        tokens={props.tokens}
        packageId="builtin"
        typeId={String(src.typeId)}
        showTitle={showTitle}
      />
    )
  }

  switch (parsed.typeId) {
    case "builtin.clock":
      return (
        <ClockWidget
          compact={parsed.config.compact ?? false}
          tokens={props.tokens}
          showSeconds={parsed.config.showSeconds ?? true}
          showTitle={showTitle}
        />
      )
    case "builtin.search":
      return (
        <SearchWidget
          tokens={props.tokens}
          config={parsed.config}
          showTitle={showTitle}
        />
      )
    case "builtin.shortcuts":
      return (
        <ShortcutsWidget
          tokens={props.tokens}
          config={parsed.config}
          showTitle={showTitle}
          reducedMotion={props.reducedMotion}
        />
      )
    case "builtin.weather":
      return (
        <WeatherWidget
          tokens={props.tokens}
          config={parsed.config}
          showTitle={showTitle}
        />
      )
    case "builtin.quote":
      return (
        <QuoteWidget
          tokens={props.tokens}
          config={parsed.config}
          showTitle={showTitle}
        />
      )
    case "builtin.hexagram":
      return (
        <div data-scrollable="true" style={{ width: "100%", height: "100%" }}>
          <HexagramBoard
            tokens={props.tokens}
            config={parsed.config}
            allowRedraw={allowRedraw}
            showTitle={showTitle}
            onConfigChange={(next) =>
              props.onWidgetConfig(props.widget.id, next)
            }
          />
        </div>
      )
    default:
      return assertNever(parsed)
  }
}
