import type { HomeDocument, MediaRef } from "@yindex/domain"
import { useEffect, useState } from "react"
import {
  type MediaAsset,
  type MediaCapacity,
  type MediaStore,
  createMediaStore,
} from "../../wallpaper/mediaStore"
import {
  capacityLabel,
  deleteMediaIfUnused,
  formatMediaBytes,
  pagesUsingMediaRef,
} from "./mediaReferences"
import { ghostBtn, h3, section } from "./styles"

export type MediaResourceListProps = {
  readonly doc: HomeDocument
  readonly assets: readonly MediaAsset[]
  readonly capacity: MediaCapacity
  readonly onDelete: (ref: MediaRef) => Promise<void>
}

export function MediaResourceList(props: MediaResourceListProps) {
  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 12, opacity: 0.72 }}>
        {capacityLabel(props.capacity)}
      </div>
      {props.assets.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.65 }}>尚未导入壁纸资源</div>
      ) : (
        <ul style={{ display: "grid", gap: 10, margin: 0, padding: 0 }}>
          {props.assets.map((asset) => {
            const usages = pagesUsingMediaRef(props.doc, asset.ref)
            const inUse = usages.length > 0
            const usageLabel = `被${usages
              .map(({ pageName }) => `「${pageName}」`)
              .join("、")}使用`
            return (
              <li
                key={String(asset.ref)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  listStyle: "none",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ overflowWrap: "anywhere", fontSize: 13 }}>
                    {asset.displayName}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 11.5, opacity: 0.65 }}>
                    {asset.kind === "image" ? "图片" : "视频"} ·{" "}
                    {formatMediaBytes(asset.byteLength)}
                  </div>
                  {inUse ? (
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      {usageLabel}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label={`删除 ${asset.displayName}`}
                  disabled={inUse}
                  title={
                    inUse ? `${usageLabel}，请先更换这些页的壁纸` : undefined
                  }
                  style={{
                    ...ghostBtn,
                    flex: "0 0 auto",
                    cursor: inUse ? "not-allowed" : "pointer",
                    opacity: inUse ? 0.45 : 1,
                  }}
                  onClick={() => props.onDelete(asset.ref)}
                >
                  删除
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

type MediaResourceSectionProps = {
  readonly doc: HomeDocument
  readonly store?: MediaStore | undefined
}

type MediaResources = {
  readonly assets: readonly MediaAsset[]
  readonly capacity: MediaCapacity
}

async function readResources(store: MediaStore): Promise<MediaResources> {
  const listed = await store.list()
  if (!listed.ok) throw new Error(`读取壁纸列表失败：${listed.error.message}`)
  const capacity = await store.capacity()
  if (!capacity.ok)
    throw new Error(`读取壁纸容量失败：${capacity.error.message}`)
  return { assets: listed.value, capacity: capacity.value }
}

export function MediaResourceSection(props: MediaResourceSectionProps) {
  const [store, setStore] = useState<MediaStore | null>(props.store ?? null)
  const [resources, setResources] = useState<MediaResources | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      let mediaStore = props.store
      if (!mediaStore) {
        const created = await createMediaStore()
        if (!active) return
        if (!created.ok) {
          setMessage(`壁纸存储不可用：${created.error.message}`)
          return
        }
        mediaStore = created.value
      }
      if (!active) return
      setStore(mediaStore)
      try {
        const next = await readResources(mediaStore)
        if (active) setResources(next)
      } catch (error) {
        if (active) {
          setMessage(
            error instanceof Error ? error.message : "读取壁纸资源失败",
          )
        }
      }
    })()
    return () => {
      active = false
    }
  }, [props.store])

  async function deleteAsset(ref: MediaRef): Promise<void> {
    if (!store) return
    const asset = resources?.assets.find(
      (candidate) => String(candidate.ref) === String(ref),
    )
    if (!asset || !confirm(`永久删除壁纸「${asset.displayName}」？`)) return
    const deleted = await deleteMediaIfUnused(props.doc, store, ref)
    if (!deleted.ok) {
      setMessage(deleted.error.message)
      return
    }
    try {
      setResources(await readResources(store))
      setMessage(`已删除 ${asset.displayName}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刷新壁纸资源失败")
    }
  }

  return (
    <section style={section}>
      <h3 style={h3}>壁纸资源</h3>
      {resources ? (
        <MediaResourceList
          doc={props.doc}
          assets={resources.assets}
          capacity={resources.capacity}
          onDelete={deleteAsset}
        />
      ) : message ? null : (
        <div style={{ fontSize: 12, opacity: 0.65 }}>正在读取壁纸资源…</div>
      )}
      {message ? (
        <output style={{ display: "block", marginTop: 10, fontSize: 12 }}>
          {message}
        </output>
      ) : null}
    </section>
  )
}
