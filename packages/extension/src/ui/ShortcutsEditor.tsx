import { faviconForUrl } from "@yindex/widgets"
import type { ChangeEvent } from "react"
import { ghostBtn, inputStyle } from "./editChromeStyles"

export type ShortcutItem = {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly favicon?: string
}

function isShortcutItem(value: unknown): value is ShortcutItem {
  if (typeof value !== "object" || value === null) return false
  if (!("id" in value) || typeof value.id !== "string") return false
  if (!("title" in value) || typeof value.title !== "string") return false
  if (!("url" in value) || typeof value.url !== "string") return false
  return !("favicon" in value) || typeof value.favicon === "string"
}

export function shortcutItemsOf(config: unknown): readonly ShortcutItem[] {
  if (typeof config !== "object" || config === null || !("items" in config)) {
    return []
  }
  if (!Array.isArray(config.items)) return []
  return config.items.filter(isShortcutItem)
}

export function ShortcutsEditor(props: {
  readonly items: readonly ShortcutItem[]
  readonly onChange: (items: readonly ShortcutItem[]) => void
}) {
  function addItem(event: ChangeEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get("title") ?? "").trim()
    let url = String(formData.get("url") ?? "").trim()
    if (!title || !url) return
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    const favicon = faviconForUrl(url)
    props.onChange([
      ...props.items,
      {
        id: `s_${Date.now().toString(36)}`,
        title,
        url,
        ...(favicon ? { favicon } : {}),
      },
    ])
    event.currentTarget.reset()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {props.items.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.6 }}>还没有链接</div>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 6,
          }}
        >
          {props.items.map((item) => (
            <li
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.title}
              </span>
              <button
                type="button"
                style={{ ...ghostBtn, padding: "2px 8px" }}
                onClick={() =>
                  props.onChange(props.items.filter((x) => x.id !== item.id))
                }
              >
                删
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={addItem} style={{ display: "grid", gap: 6 }}>
        <input name="title" placeholder="标题" style={inputStyle} required />
        <input name="url" placeholder="https://…" style={inputStyle} required />
        <button type="submit" style={ghostBtn}>
          添加链接
        </button>
      </form>
    </div>
  )
}
