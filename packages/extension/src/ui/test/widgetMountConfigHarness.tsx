import type { HomeDocument, Page, WidgetInstance } from "@yindex/domain"
import { createElement, useEffect, useRef } from "react"
import { createDefaultHome } from "../../default/createDefaultHome"
import { useHomeState } from "../../newtab/useHomeState"
import { loadHomeDocument, resetHomeDocument } from "../../storage/homeStorage"
import {
  installVideoStillTestDom,
  mountVideoSurface,
} from "./videoStillDomHarness"

export const noWidgetConfig = (): void => {}

export function malformedShortcutsFixture(): {
  readonly doc: HomeDocument
  readonly page: Page
  readonly widget: WidgetInstance
} {
  const doc = createDefaultHome()
  const pageId = doc.sequence.pageIds[0]
  if (pageId === undefined) {
    throw new Error("default Home must contain its first Page")
  }
  const page = doc.pages[pageId]
  if (page === undefined) {
    throw new Error("default Home must contain its landing Page")
  }
  const widget = page.widgets.find(
    (candidate) =>
      candidate.source.kind === "builtin" &&
      candidate.source.typeId === "builtin.shortcuts",
  )
  if (widget === undefined) {
    throw new Error("default landing Page must contain Shortcuts")
  }
  return { doc, page, widget: { ...widget, config: {} } }
}

function ReplacementProbe(props: {
  readonly replacement: HomeDocument
  readonly onPersisted: (doc: HomeDocument) => void
  readonly onError: (error: unknown) => void
}) {
  const home = useHomeState()
  const started = useRef(false)
  useEffect(() => {
    if (home.loading || home.doc === null || started.current) return
    started.current = true
    home.replaceDoc(props.replacement)
    void home
      .persistNow()
      .then(loadHomeDocument)
      .then(props.onPersisted, props.onError)
  }, [
    home.doc,
    home.loading,
    home.persistNow,
    home.replaceDoc,
    props.onError,
    props.onPersisted,
    props.replacement,
  ])
  return createElement("span", null, home.loading ? "loading" : "ready")
}

export async function replacePersistReload(
  replacement: HomeDocument,
): Promise<HomeDocument> {
  await resetHomeDocument("full")
  const testDocument = installVideoStillTestDom()
  const mounted = mountVideoSurface(testDocument)
  let loaded: HomeDocument | null = null
  try {
    const persisted = new Promise<HomeDocument>((resolve, reject) => {
      void mounted
        .render(
          createElement(ReplacementProbe, {
            replacement,
            onPersisted: resolve,
            onError: reject,
          }),
        )
        .catch(reject)
    })
    loaded = await persisted
  } finally {
    await mounted.unmount()
  }
  if (loaded === null) throw new Error("replacement did not persist")
  return loaded
}
