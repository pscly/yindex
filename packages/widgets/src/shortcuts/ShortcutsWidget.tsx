import type { StyleTokens } from "@yindex/domain"
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { parseSafeNavigationUrl } from "../navigation/safeNavigationUrl"
import { BareSurface, buildGlassTileStyle } from "../shell/surface"
import type { LivingGlassCssProperties } from "../shell/surface"
import {
  type ShortcutCell,
  type ShortcutFolder,
  type ShortcutItem,
  type ShortcutsWidgetConfig,
  folderPreviewItems,
  isShortcutFolder,
  resolveShortcutIcon,
  shortcutFallbackPalette,
} from "./shortcutsModel"

export {
  type ShortcutCell,
  type ShortcutFolder,
  type ShortcutItem,
  type ShortcutsWidgetConfig,
  faviconForUrl,
  folderPreviewItems,
  isShortcutCell,
  isShortcutFolder,
  isShortcutItem,
  isShortcutsWidgetConfig,
  resolveShortcutIcon,
  shortcutFallbackHue,
  shortcutFallbackPalette,
} from "./shortcutsModel"

export type ShortcutsWidgetProps = {
  readonly tokens: StyleTokens
  readonly config: ShortcutsWidgetConfig
  readonly showTitle?: boolean | undefined
  readonly reducedMotion?: boolean | undefined
  readonly onOpen?: (url: string) => void
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

export type FolderOverlayAction =
  | { readonly type: "toggle"; readonly folderId: string }
  | { readonly type: "close" }

/** Pure open/close state machine for the in-place folder overlay. */
export function reduceFolderOverlay(
  openFolderId: string | null,
  action: FolderOverlayAction,
): string | null {
  switch (action.type) {
    case "toggle":
      return openFolderId === action.folderId ? null : action.folderId
    case "close":
      return null
  }
}

const TILE_HOVER_STYLES = `
.yindex-shortcut-squircle {
  transition: transform 160ms ease, filter 160ms ease, box-shadow 160ms ease;
}
.yindex-shortcut-tile:hover .yindex-shortcut-squircle,
.yindex-shortcut-tile:focus-visible .yindex-shortcut-squircle {
  transform: scale(1.05);
  filter: brightness(1.08);
}
@media (prefers-reduced-motion: reduce) {
  .yindex-shortcut-squircle { transition: none; }
  .yindex-shortcut-tile:hover .yindex-shortcut-squircle,
  .yindex-shortcut-tile:focus-visible .yindex-shortcut-squircle {
    transform: none;
    filter: none;
  }
}
`

const TILE_HOVER_STYLES_REDUCED = `
.yindex-shortcut-squircle { transition: none; }
`

const FOLDER_SPRING_MS = 200
const FOLDER_SPRING_EASE = "cubic-bezier(0.34, 1.4, 0.64, 1)"

function labelStyle(): CSSProperties {
  return {
    maxWidth: 78,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 12,
    lineHeight: 1.3,
    textAlign: "center",
    color: "var(--yindex-widget-foreground)",
  }
}

function tileFrameStyle(disabled: boolean): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 7,
    textDecoration: "none",
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit",
    minWidth: 0,
    opacity: disabled ? 0.45 : 1,
    pointerEvents: disabled ? "none" : "auto",
  }
}

function LetterFallback(props: {
  readonly title: string
  readonly url: string
  readonly fontSize: number
}) {
  const palette = shortcutFallbackPalette(props.url)
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: palette.background,
        color: palette.foreground,
        fontWeight: 600,
        fontSize: props.fontSize,
      }}
    >
      {props.title.slice(0, 1)}
    </span>
  )
}

function ShortcutIcon(props: {
  readonly item: ShortcutItem
  readonly size: number
}) {
  const [failed, setFailed] = useState(false)
  const icon = resolveShortcutIcon(props.item)
  if (!icon || failed) {
    return (
      <LetterFallback
        title={props.item.title}
        url={props.item.url}
        fontSize={Math.round(props.size * 0.42)}
      />
    )
  }
  return (
    <img
      src={icon}
      alt=""
      width={Math.round(props.size * 0.55)}
      height={Math.round(props.size * 0.55)}
      style={{ objectFit: "contain", position: "relative", zIndex: 1 }}
      onError={() => setFailed(true)}
    />
  )
}

function squircleStyle(
  tokens: StyleTokens,
  size: number,
): LivingGlassCssProperties {
  return {
    ...buildGlassTileStyle(tokens, Math.round(size * 0.3)),
    width: size,
    height: size,
    position: "relative",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    flex: "0 0 auto",
  }
}

function ShortcutTile(props: {
  readonly tokens: StyleTokens
  readonly item: ShortcutItem
  readonly size?: number | undefined
  readonly onOpen?: ((url: string) => void) | undefined
}) {
  const size = props.size ?? 64
  const href = safeShortcutHref(props.item.url)
  const body = (
    <>
      <span
        className="yindex-shortcut-squircle"
        style={squircleStyle(props.tokens, size)}
      >
        <ShortcutIcon item={props.item} size={size} />
      </span>
      <span style={labelStyle()}>{props.item.title}</span>
    </>
  )
  if (!href) {
    return (
      <span
        title={`${props.item.title}（不安全的链接，已禁用）`}
        aria-disabled="true"
        style={tileFrameStyle(true)}
      >
        {body}
      </span>
    )
  }
  return (
    <a
      className="yindex-shortcut-tile"
      href={href}
      rel="noopener noreferrer"
      title={props.item.title}
      onClick={(e) => {
        if (props.onOpen) {
          e.preventDefault()
          openShortcutIfSafe(props.item.url, props.onOpen)
        }
      }}
      style={tileFrameStyle(false)}
    >
      {body}
    </a>
  )
}

function FolderPreviewMini(props: { readonly item: ShortcutItem }) {
  const icon = resolveShortcutIcon(props.item)
  const [failed, setFailed] = useState(false)
  const base: CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: 7,
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    position: "relative",
    background:
      "color-mix(in oklch, var(--yindex-glass-tint, white) 55%, transparent)",
  }
  if (!icon || failed) {
    const palette = shortcutFallbackPalette(props.item.url)
    return (
      <span
        aria-hidden="true"
        style={{
          ...base,
          background: palette.background,
          color: palette.foreground,
          fontWeight: 600,
          fontSize: 11,
        }}
      >
        {props.item.title.slice(0, 1)}
      </span>
    )
  }
  return (
    <span aria-hidden="true" style={base}>
      <img
        src={icon}
        alt=""
        width={14}
        height={14}
        style={{ objectFit: "contain" }}
        onError={() => setFailed(true)}
      />
    </span>
  )
}

function FolderTile(props: {
  readonly tokens: StyleTokens
  readonly folder: ShortcutFolder
  readonly expanded: boolean
  readonly buttonRef: (node: HTMLButtonElement | null) => void
  readonly onToggle: () => void
}) {
  const preview = folderPreviewItems(props.folder)
  return (
    <button
      ref={props.buttonRef}
      type="button"
      className="yindex-shortcut-tile"
      title={props.folder.title}
      aria-label={`${props.folder.title}（文件夹，${props.folder.items.length} 个链接）`}
      aria-haspopup="dialog"
      aria-expanded={props.expanded}
      onClick={props.onToggle}
      style={tileFrameStyle(false)}
    >
      <span
        className="yindex-shortcut-squircle"
        style={squircleStyle(props.tokens, 64)}
      >
        <span
          aria-hidden="true"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, auto)",
            gap: 5,
            position: "relative",
            zIndex: 1,
          }}
        >
          {preview.map((item) => (
            <FolderPreviewMini key={item.id} item={item} />
          ))}
        </span>
      </span>
      <span style={labelStyle()}>{props.folder.title}</span>
    </button>
  )
}

function FolderOverlay(props: {
  readonly tokens: StyleTokens
  readonly folder: ShortcutFolder
  readonly reducedMotion: boolean
  readonly onClose: () => void
  readonly onOpen?: ((url: string) => void) | undefined
}) {
  const [entered, setEntered] = useState(props.reducedMotion)
  const closingRef = useRef(false)

  useEffect(() => {
    if (props.reducedMotion) return
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [props.reducedMotion])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    if (props.reducedMotion) {
      props.onClose()
      return
    }
    setEntered(false)
    window.setTimeout(props.onClose, FOLDER_SPRING_MS)
  }, [props])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [requestClose])

  const transition = props.reducedMotion
    ? "none"
    : `opacity ${FOLDER_SPRING_MS}ms ease, transform ${FOLDER_SPRING_MS}ms ${FOLDER_SPRING_EASE}`

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "grid",
        placeItems: "center",
      }}
    >
      <button
        type="button"
        aria-label={`关闭文件夹 ${props.folder.title}`}
        onClick={requestClose}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "default",
          background: "color-mix(in oklch, black 32%, transparent)",
          opacity: entered ? 1 : 0,
          transition,
        }}
      />
      <dialog
        open
        aria-label={props.folder.title}
        style={{
          ...buildGlassTileStyle(props.tokens, 22),
          position: "relative",
          inset: "auto",
          width: "auto",
          height: "auto",
          maxWidth: "min(440px, 86vw)",
          maxHeight: "min(60vh, 480px)",
          overflow: "auto",
          padding: 18,
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
          gap: "16px 12px",
          alignContent: "start",
          transform: entered ? "scale(1)" : "scale(0.92)",
          transition,
        }}
      >
        {props.folder.items.map((item) => (
          <ShortcutTile
            key={item.id}
            tokens={props.tokens}
            item={item}
            size={56}
            onOpen={props.onOpen}
          />
        ))}
      </dialog>
    </div>
  )
}

export function ShortcutsWidget(props: ShortcutsWidgetProps) {
  const reducedMotion = props.reducedMotion ?? false
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const folderButtons = useRef(new Map<string, HTMLButtonElement>())

  const cells = props.config.items
  const openFolder = cells.find(
    (cell): cell is ShortcutFolder =>
      isShortcutFolder(cell) && cell.id === openFolderId,
  )

  function dispatchOverlay(action: FolderOverlayAction) {
    setOpenFolderId((current) => reduceFolderOverlay(current, action))
  }

  function closeFolder() {
    const closingId = openFolderId
    dispatchOverlay({ type: "close" })
    if (closingId) {
      folderButtons.current.get(closingId)?.focus()
    }
  }

  return (
    <BareSurface
      tokens={props.tokens}
      title="快捷方式"
      showTitle={props.showTitle}
    >
      <style>
        {reducedMotion ? TILE_HOVER_STYLES_REDUCED : TILE_HOVER_STYLES}
      </style>
      {cells.length === 0 ? (
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
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(72px, 84px))",
            justifyContent: "center",
            gap: "18px 12px",
            alignContent: "start",
            height: "100%",
            overflow: "auto",
            padding: "6px 2px",
          }}
        >
          {cells.map((cell) =>
            isShortcutFolder(cell) ? (
              <FolderTile
                key={cell.id}
                tokens={props.tokens}
                folder={cell}
                expanded={openFolderId === cell.id}
                buttonRef={(node) => {
                  if (node) folderButtons.current.set(cell.id, node)
                  else folderButtons.current.delete(cell.id)
                }}
                onToggle={() =>
                  dispatchOverlay({ type: "toggle", folderId: cell.id })
                }
              />
            ) : (
              <ShortcutTile
                key={cell.id}
                tokens={props.tokens}
                item={cell}
                onOpen={props.onOpen}
              />
            ),
          )}
        </div>
      )}
      {openFolder ? (
        <FolderOverlay
          tokens={props.tokens}
          folder={openFolder}
          reducedMotion={reducedMotion}
          onClose={closeFolder}
          onOpen={props.onOpen}
        />
      ) : null}
    </BareSurface>
  )
}
