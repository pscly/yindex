import {
  type ShortcutCell,
  type ShortcutFolder,
  type ShortcutItem,
  faviconForUrl,
  isShortcutCell,
  isShortcutFolder,
  parseSafeNavigationUrl,
} from "@yindex/widgets"
import { type ChangeEvent, useState } from "react"
import { ghostBtn, inputStyle } from "./editChromeStyles"

export type { ShortcutCell, ShortcutFolder, ShortcutItem }

export function shortcutCellsOf(config: unknown): readonly ShortcutCell[] {
  if (typeof config !== "object" || config === null || !("items" in config)) {
    return []
  }
  if (!Array.isArray(config.items)) return []
  return config.items.filter(isShortcutCell)
}

function buildShortcutItem(input: {
  readonly title: string
  readonly url: string
  readonly now: number
}): ShortcutItem | null {
  const title = input.title.trim()
  let url = input.url.trim()
  if (!title || !url) return null
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)
  if (!hasScheme) url = `https://${url}`
  const safe = parseSafeNavigationUrl(url)
  if (!safe.ok) return null
  url = safe.value
  const favicon = faviconForUrl(url)
  return {
    id: `s_${input.now.toString(36)}`,
    title,
    url,
    ...(favicon ? { favicon } : {}),
  }
}

/**
 * Appends a validated Shortcut to the grid, or into one Folder when
 * `folderId` is given. Returns null when the input is not a safe link.
 */
export function tryAddShortcutItem(input: {
  readonly title: string
  readonly url: string
  readonly existing: readonly ShortcutCell[]
  readonly folderId?: string | undefined
  readonly now?: number | undefined
}): readonly ShortcutCell[] | null {
  const now = input.now ?? Date.now()
  const item = buildShortcutItem({
    title: input.title,
    url: input.url,
    now,
  })
  if (!item) return null
  if (!input.folderId) return [...input.existing, item]
  return input.existing.map((cell) =>
    isShortcutFolder(cell) && cell.id === input.folderId
      ? { ...cell, items: [...cell.items, item] }
      : cell,
  )
}

/** Creates an empty single-level Shortcut Folder. */
export function tryAddShortcutFolder(input: {
  readonly title: string
  readonly existing: readonly ShortcutCell[]
  readonly now?: number | undefined
}): readonly ShortcutCell[] | null {
  const title = input.title.trim()
  if (!title) return null
  const now = input.now ?? Date.now()
  return [...input.existing, { id: `f_${now.toString(36)}`, title, items: [] }]
}

function readLinkForm(form: HTMLFormElement): {
  readonly title: string
  readonly url: string
} {
  const formData = new FormData(form)
  return {
    title: String(formData.get("title") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
  }
}

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  fontSize: 12,
} as const

const titleTextStyle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const

function LinkForm(props: {
  readonly submitLabel: string
  readonly onSubmit: (title: string, url: string, form: HTMLFormElement) => void
}) {
  function handleSubmit(event: ChangeEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const { title, url } = readLinkForm(form)
    props.onSubmit(title, url, form)
  }
  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 6 }}>
      <input name="title" placeholder="标题" style={inputStyle} required />
      <input name="url" placeholder="https://…" style={inputStyle} required />
      <button type="submit" style={ghostBtn}>
        {props.submitLabel}
      </button>
    </form>
  )
}

function FolderEditor(props: {
  readonly folder: ShortcutFolder
  readonly cells: readonly ShortcutCell[]
  readonly onChange: (cells: readonly ShortcutCell[]) => void
}) {
  const [expanded, setExpanded] = useState(false)

  function removeMember(memberId: string) {
    props.onChange(
      props.cells.map((cell) =>
        isShortcutFolder(cell) && cell.id === props.folder.id
          ? {
              ...cell,
              items: cell.items.filter((member) => member.id !== memberId),
            }
          : cell,
      ),
    )
  }

  function addMember(title: string, url: string, form: HTMLFormElement) {
    const next = tryAddShortcutItem({
      title,
      url,
      existing: props.cells,
      folderId: props.folder.id,
    })
    if (!next) return
    props.onChange(next)
    form.reset()
  }

  return (
    <li style={{ display: "grid", gap: 6 }}>
      <div style={rowStyle}>
        <button
          type="button"
          style={{
            ...ghostBtn,
            padding: "2px 6px",
            border: "none",
            background: "none",
            textAlign: "left",
            flex: 1,
            ...titleTextStyle,
          }}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "▾" : "▸"} {props.folder.title}（
          {props.folder.items.length}）
        </button>
        <button
          type="button"
          style={{ ...ghostBtn, padding: "2px 8px" }}
          onClick={() =>
            props.onChange(
              props.cells.filter((cell) => cell.id !== props.folder.id),
            )
          }
        >
          删
        </button>
      </div>
      {expanded ? (
        <div
          style={{
            display: "grid",
            gap: 6,
            paddingLeft: 12,
            borderLeft: "1px solid currentColor",
          }}
        >
          {props.folder.items.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.6 }}>空文件夹</div>
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
              {props.folder.items.map((member) => (
                <li key={member.id} style={rowStyle}>
                  <span style={titleTextStyle}>{member.title}</span>
                  <button
                    type="button"
                    style={{ ...ghostBtn, padding: "2px 8px" }}
                    onClick={() => removeMember(member.id)}
                  >
                    删
                  </button>
                </li>
              ))}
            </ul>
          )}
          <LinkForm submitLabel="添加到文件夹" onSubmit={addMember} />
        </div>
      ) : null}
    </li>
  )
}

export function ShortcutsEditor(props: {
  readonly cells: readonly ShortcutCell[]
  readonly onChange: (cells: readonly ShortcutCell[]) => void
}) {
  function addItem(title: string, url: string, form: HTMLFormElement) {
    const next = tryAddShortcutItem({ title, url, existing: props.cells })
    if (!next) return
    props.onChange(next)
    form.reset()
  }

  function addFolder(event: ChangeEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const title = String(new FormData(form).get("folderTitle") ?? "").trim()
    const next = tryAddShortcutFolder({ title, existing: props.cells })
    if (!next) return
    props.onChange(next)
    form.reset()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {props.cells.length === 0 ? (
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
          {props.cells.map((cell) =>
            isShortcutFolder(cell) ? (
              <FolderEditor
                key={cell.id}
                folder={cell}
                cells={props.cells}
                onChange={props.onChange}
              />
            ) : (
              <li key={cell.id} style={rowStyle}>
                <span style={titleTextStyle}>{cell.title}</span>
                <button
                  type="button"
                  style={{ ...ghostBtn, padding: "2px 8px" }}
                  onClick={() =>
                    props.onChange(props.cells.filter((x) => x.id !== cell.id))
                  }
                >
                  删
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      <LinkForm submitLabel="添加链接" onSubmit={addItem} />
      <form onSubmit={addFolder} style={{ display: "grid", gap: 6 }}>
        <input
          name="folderTitle"
          placeholder="文件夹名称"
          style={inputStyle}
          required
        />
        <button type="submit" style={ghostBtn}>
          新建文件夹
        </button>
      </form>
    </div>
  )
}
