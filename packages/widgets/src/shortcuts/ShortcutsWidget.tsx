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

/** Best-effort favicon URL for a site */
export function faviconForUrl(url: string): string | undefined {
  try {
    const u = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=64`
  } catch {
    return undefined
  }
}

export function ShortcutsWidget(props: ShortcutsWidgetProps) {
  const items = props.config.items

  return (
    <WidgetSurface tokens={props.tokens} title="快捷方式">
      {items.length === 0 ? (
        <div style={{ color: props.tokens.color.muted, fontSize: 13 }}>
          暂无快捷方式。进入编辑态选中本组件后可添加链接。
        </div>
      ) : (
        <div
          data-scrollable="true"
          onWheel={(e) => e.stopPropagation()}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
            gap: 12,
            alignContent: "start",
            height: "100%",
            overflow: "auto",
          }}
        >
          {items.map((item) => {
            const icon = item.favicon ?? faviconForUrl(item.url)
            return (
              <a
                key={item.id}
                href={item.url}
                rel="noopener noreferrer"
                title={item.title}
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
                  minWidth: 0,
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
                    overflow: "hidden",
                    flex: "0 0 auto",
                  }}
                >
                  {icon ? (
                    <img
                      src={icon}
                      alt=""
                      width={20}
                      height={20}
                      style={{ objectFit: "contain" }}
                      onError={(e) => {
                        const img = e.currentTarget
                        img.style.display = "none"
                        const parent = img.parentElement
                        if (parent && !parent.dataset["fallback"]) {
                          parent.dataset["fallback"] = "1"
                          parent.textContent = item.title.slice(0, 1)
                        }
                      }}
                    />
                  ) : (
                    item.title.slice(0, 1)
                  )}
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
            )
          })}
        </div>
      )}
    </WidgetSurface>
  )
}
