import type { StyleTokens } from "@yindex/domain"
import { WidgetSurface } from "../shell/surface"

export type ShortcutItem = {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly favicon?: string
}

export type ShortcutsWidgetConfig = {
  readonly items: readonly ShortcutItem[]
}

export type ShortcutsWidgetProps = {
  readonly tokens: StyleTokens
  readonly config: ShortcutsWidgetConfig
  readonly onOpen?: (url: string) => void
}

export function ShortcutsWidget(props: ShortcutsWidgetProps) {
  const items = props.config.items

  return (
    <WidgetSurface tokens={props.tokens} title="快捷方式">
      {items.length === 0 ? (
        <div style={{ color: props.tokens.color.muted, fontSize: 13 }}>
          暂无快捷方式。在编辑态或设置中添加链接。
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              onClick={(e) => {
                if (props.onOpen) {
                  e.preventDefault()
                  props.onOpen(item.url)
                }
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                color: props.tokens.color.ink,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: `color-mix(in oklch, ${props.tokens.color.accent} 18%, ${props.tokens.color.surface})`,
                  fontWeight: 600,
                }}
              >
                {item.title.slice(0, 1)}
              </span>
              <span
                style={{
                  maxWidth: 72,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.title}
              </span>
            </a>
          ))}
        </div>
      )}
    </WidgetSurface>
  )
}
