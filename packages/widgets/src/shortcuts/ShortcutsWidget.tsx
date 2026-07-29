import type { StyleTokens } from "@yindex/domain"
import { parseSafeNavigationUrl } from "../navigation/safeNavigationUrl"
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

export function safeShortcutHref(url: string): string | null {
  const safe = parseSafeNavigationUrl(url)
  return safe.ok ? safe.value : null
}

export function openShortcutIfSafe(
  url: string,
  onOpen?: ((url: string) => void) | undefined,
): string | null {
  const href = safeShortcutHref(url)
  if (!href) return null
  if (onOpen) onOpen(href)
  return href
}

export function ShortcutsWidget(props: ShortcutsWidgetProps) {
  const items = props.config.items

  return (
    <LensSurface
      tokens={props.tokens}
      shape="shelf"
      title="快捷方式"
      showTitle={props.showTitle}
    >
      {items.length === 0 ? (
        <div
          style={{
            color: "var(--yindex-widget-muted-foreground)",
            fontSize: 13,
          }}
        >
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
            const href = safeShortcutHref(item.url)
            const tileStyle = {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "var(--yindex-widget-foreground)",
              fontSize: 12,
              minWidth: 0,
              opacity: href ? 1 : 0.45,
              pointerEvents: href ? "auto" : "none",
            } as const
            const body = (
              <>
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
                  }}
                >
                  {item.title}
                </span>
              </>
            )
            if (!href) {
              return (
                <span
                  key={item.id}
                  title={`${item.title}（不安全的链接，已禁用）`}
                  aria-disabled="true"
                  style={tileStyle}
                >
                  {body}
                </span>
              )
            }
            return (
              <a
                key={item.id}
                href={href}
                rel="noopener noreferrer"
                title={item.title}
                onClick={(e) => {
                  if (props.onOpen) {
                    e.preventDefault()
                    openShortcutIfSafe(item.url, props.onOpen)
                  }
                }}
                style={tileStyle}
              >
                {body}
              </a>
            )
          })}
        </div>
      )}
    </LensSurface>
  )
}
