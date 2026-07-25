import {
  GENERATIVE_PRESETS,
  type HomeDocument,
  type Page,
  type PageId,
  type Result,
  type Wallpaper,
  type WallpaperParseError,
  createGenerativeWallpaper,
} from "@yindex/domain"
import { useEffect, useState } from "react"
import { createMediaStore } from "../wallpaper/mediaStore"
import type { MediaAsset, MediaStore } from "../wallpaper/mediaStoreTypes"
import { ghostBtn, inputStyle, labelStyle } from "./chromeStyles"
import { applyWallpaper } from "./editPageStyle"
import {
  createStoredWallpaper,
  importWallpaperFile,
  wallpaperImportErrorMessage,
  wallpaperWithDim,
} from "./editWallpaper"

const PRESET_LABELS = {
  moment: "此刻",
  muse: "灵感",
  flow: "流光",
} as const

const WALLPAPER_KIND_LABELS = {
  generative: "生成式壁纸",
  image: "图片壁纸",
  video: "视频壁纸",
} as const

export function EditWallpaperSection(props: {
  readonly doc: HomeDocument
  readonly page: Page
  readonly pageId: PageId
  readonly onDoc: (doc: HomeDocument) => void
  readonly store?: MediaStore | undefined
}) {
  const [mediaStore, setMediaStore] = useState<MediaStore | null>(
    props.store ?? null,
  )
  const [assets, setAssets] = useState<readonly MediaAsset[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const wallpaper = props.page.style.wallpaper
  const dim = Number(wallpaper.dim)

  useEffect(() => {
    let active = true
    setMediaStore(props.store ?? null)
    setAssets([])
    async function connect(): Promise<void> {
      const storeResult =
        props.store === undefined
          ? await createMediaStore()
          : { ok: true as const, value: props.store }
      if (!active) return
      if (!storeResult.ok) {
        setErrorMessage(wallpaperImportErrorMessage(storeResult.error))
        return
      }
      setMediaStore(storeResult.value)
      const listed = await storeResult.value.list()
      if (!active) return
      if (!listed.ok) {
        setErrorMessage(wallpaperImportErrorMessage(listed.error))
        return
      }
      setAssets(listed.value)
    }
    void connect()
    return () => {
      active = false
    }
  }, [props.store])

  function publish(result: Result<Wallpaper, WallpaperParseError>): void {
    if (!result.ok) {
      setErrorMessage(wallpaperImportErrorMessage(result.error))
      return
    }
    const updated = applyWallpaper(
      props.doc,
      props.pageId,
      props.page.style,
      result.value,
    )
    if (updated === null) {
      setErrorMessage("无法更新当前页壁纸")
      return
    }
    setErrorMessage(null)
    props.onDoc(updated)
  }

  async function refreshAssets(store: MediaStore): Promise<void> {
    const listed = await store.list()
    if (!listed.ok) {
      setErrorMessage(wallpaperImportErrorMessage(listed.error))
      return
    }
    setAssets(listed.value)
  }

  async function handleFile(store: MediaStore, file: File): Promise<void> {
    const imported = await importWallpaperFile(store, file, dim)
    if (!imported.ok) {
      setErrorMessage(wallpaperImportErrorMessage(imported.error))
      return
    }
    publish(imported)
    await refreshAssets(store)
  }

  return (
    <section style={{ marginTop: 14 }} aria-labelledby="edit-wallpaper-heading">
      <div
        id="edit-wallpaper-heading"
        style={{ marginBottom: 6, opacity: 0.75 }}
      >
        壁纸
      </div>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8 }}>
        当前：{WALLPAPER_KIND_LABELS[wallpaper.kind]}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {GENERATIVE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            style={ghostBtn}
            aria-pressed={
              wallpaper.kind === "generative" &&
              wallpaper.generativePreset === preset
            }
            onClick={() =>
              publish(
                createGenerativeWallpaper({ generativePreset: preset, dim }),
              )
            }
          >
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>
      <label style={{ ...labelStyle, marginTop: 10 }}>
        壁纸压暗 · {Math.round(dim * 100)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={dim}
          onChange={(event) =>
            publish(wallpaperWithDim(wallpaper, Number(event.target.value)))
          }
          style={{ width: "100%", marginTop: 6 }}
        />
      </label>
      <label style={{ ...labelStyle, marginTop: 10 }}>
        导入本地壁纸
        <input
          type="file"
          accept="image/*,video/*"
          disabled={mediaStore === null}
          style={{ ...inputStyle, padding: 6 }}
          onChange={(event) => {
            const input = event.currentTarget
            const file = input.files?.[0]
            if (file === undefined || mediaStore === null) return
            void handleFile(mediaStore, file).then(() => {
              input.value = ""
            })
          }}
        />
      </label>
      {errorMessage === null ? null : (
        <div
          role="alert"
          style={{ marginTop: 6, color: "oklch(0.75 0.14 25)" }}
        >
          {errorMessage}
        </div>
      )}
      {assets.length === 0 ? null : (
        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
          {assets.map((asset) => (
            <button
              key={String(asset.ref)}
              type="button"
              style={{ ...ghostBtn, textAlign: "left" }}
              onClick={() => publish(createStoredWallpaper(asset, dim))}
            >
              {asset.displayName} · {asset.kind === "image" ? "图片" : "视频"}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
