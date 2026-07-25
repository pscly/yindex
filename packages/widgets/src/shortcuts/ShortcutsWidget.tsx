import type { StyleTokens } from "@yindex/domain"
import { LensSurface } from "../shell/surface"

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
  readonly showTitle?: boolean | undefined
  readonly onOpen?: (url: string) => void
}

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

  const lensInk = props.tokens.glass.adaptive.lens.foreground
  const lensMuted = props.tokens.glass.adaptive.lens.mutedForeground

  return (
    <LensSurface
      tokens={props.tokens}
      shape="shelf"
      title="快捷方式"
      showTitle={props.showTitle}
    >
      {items.length === 0 ? (
        <div style={{ color: lensMuted, fontSize: 13 }}>
          暂无快捷方式。进入编辑态选中后可添加链接。
        </div>
      ) : (
        <div
          data-scrollable="true"
          onWheel={(e) => e.stopPropagation()}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
            gap: 14,
            alignContent: "start",
            height: "100%",
            overflow: "auto",
            paddingTop: 2,
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
                  gap: 8,
                  textDecoration: "none",
                  color: lensInk,
                  fontSize: 12,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: "transparent",
                    border:
                      "1px solid color-mix(in oklch, white 12%, transparent)",
                    overflow: "hidden",
                    flex: "0 0 auto",
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  {icon ? (
                    <img
                      src={icon}
                      alt=""
                      width={22}
                      height={22}
                      style={{ objectFit: "contain" }}
                      onError={(e) => {
                        const img = e.currentTarget
                        img.style.display = "none"
                        const parent = img.parentElement
                        if (parent && !parent.hasAttribute("data-fallback")) {
                          parent.setAttribute("data-fallback", "1")
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
                    opacity: 0.88,
                  }}
                >
                  {item.title}
                </span>
              </a>
            )
          })}
        </div>
      )}
    </LensSurface>
  )
}
