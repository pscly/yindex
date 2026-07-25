import { expect, test } from "bun:test"
import { createImageWallpaper, updatePage } from "@yindex/domain"
import { Children, type ReactNode, isValidElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../../default/createDefaultHome"
import { makeFile, openStore } from "../../wallpaper/mediaStoreTestUtils.test"
import {
  MediaResourceList,
  type MediaResourceListProps,
} from "./MediaResourceSection"
import { capacityLabel } from "./mediaReferences"

type DeleteButtonProps = {
  readonly "aria-label"?: string
  readonly disabled?: boolean
  readonly onClick?: () => Promise<void>
}

function findDeleteButton(node: ReactNode, name: string): ReactNode {
  if (
    isValidElement<DeleteButtonProps>(node) &&
    node.type === "button" &&
    node.props["aria-label"] === `删除 ${name}`
  ) {
    return node
  }
  if (!isValidElement<{ readonly children?: ReactNode }>(node)) return null
  for (const child of Children.toArray(node.props.children)) {
    const found = findDeleteButton(child, name)
    if (found !== null) return found
  }
  return null
}

test("Given used and free assets, When the media resource list renders, Then capacity and Page usage are shown and only the free asset can be deleted", async () => {
  // Given
  let sequence = 0
  const { store } = await openStore({
    createId: () => `media_ui_${++sequence}`,
  })
  const used = await store.importFile(
    makeFile({
      name: "used.png",
      type: "image/png",
      bytes: new Uint8Array([1, 2, 3, 4]),
    }),
  )
  const free = await store.importFile(
    makeFile({
      name: "free.jpg",
      type: "image/jpeg",
      bytes: new Uint8Array([5, 6, 7]),
    }),
  )
  const capacity = await store.capacity()
  expect(used.ok && free.ok && capacity.ok).toBe(true)
  if (!used.ok || !free.ok || !capacity.ok) return
  const doc = createDefaultHome()
  const pageId = doc.sequence.pageIds[0]
  if (!pageId) throw new Error("default Home must contain a Page")
  const wallpaper = createImageWallpaper({
    mediaRef: String(used.value.ref),
    dim: 0.1,
  })
  expect(wallpaper.ok).toBe(true)
  if (!wallpaper.ok) return
  const referenced = updatePage(doc, pageId, (page) => ({
    ...page,
    style: { ...page.style, wallpaper: wallpaper.value },
  }))
  expect(referenced.ok).toBe(true)
  if (!referenced.ok) return
  const deletedRefs: string[] = []
  const props: MediaResourceListProps = {
    doc: referenced.value,
    assets: [used.value, free.value],
    capacity: capacity.value,
    onDelete: async (ref) => {
      deletedRefs.push(String(ref))
    },
  }

  // When
  const list = MediaResourceList(props)
  const markup = renderToStaticMarkup(list)
  const usedButton = findDeleteButton(list, "used.png")
  const freeButton = findDeleteButton(list, "free.jpg")

  // Then
  expect(markup).toContain(capacityLabel(capacity.value))
  expect(markup).toContain("被「此刻」使用")
  expect(isValidElement<DeleteButtonProps>(usedButton)).toBe(true)
  expect(isValidElement<DeleteButtonProps>(freeButton)).toBe(true)
  if (
    !isValidElement<DeleteButtonProps>(usedButton) ||
    !isValidElement<DeleteButtonProps>(freeButton) ||
    !freeButton.props.onClick
  ) {
    return
  }
  expect(usedButton.props.disabled).toBe(true)
  expect(freeButton.props.disabled).toBe(false)
  await freeButton.props.onClick()
  expect(deletedRefs).toEqual([String(free.value.ref)])
})
