import { type ReactElement, act } from "react"
import { type Root, createRoot } from "react-dom/client"
import { VideoStillTestNode } from "./videoStillDomNode"
import { VideoStillTestDocument } from "./videoStillTestDocument"

export function installVideoStillTestDom(): VideoStillTestDocument {
  const doc = new VideoStillTestDocument()
  Object.assign(globalThis, {
    document: doc,
    window: globalThis,
    self: globalThis,
    HTMLElement: class HTMLElement {},
    Element: VideoStillTestNode,
    Node: VideoStillTestNode,
    DocumentFragment: class DocumentFragment {},
    Text: class Text {},
    Comment: class Comment {},
    SVGElement: class SVGElement {},
    HTMLMediaElement: { HAVE_CURRENT_DATA: 2, HAVE_METADATA: 1 },
    HTMLVideoElement: VideoStillTestNode,
    HTMLIFrameElement: class HTMLIFrameElement {},
    HTMLInputElement: class HTMLInputElement {},
    MutationObserver: class MutationObserver {
      observe(): void {}
      disconnect(): void {}
      takeRecords(): unknown[] {
        return []
      }
    },
    getComputedStyle: () =>
      new Proxy(
        {},
        {
          get: () => "",
        },
      ),
    requestAnimationFrame: (callback: (time: number) => void) =>
      setTimeout(() => callback(0), 0),
    cancelAnimationFrame: (id: number) => clearTimeout(id),
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  Object.assign(URL, {
    createObjectURL: () => doc.createObjectUrl(),
    revokeObjectURL: (url: string) => doc.revokeObjectUrl(url),
  })
  return doc
}

export type MountedVideoSurface = {
  readonly host: HTMLElement
  readonly root: Root
  render(element: ReactElement): Promise<void>
  unmount(): Promise<void>
}

export function mountVideoSurface(
  doc: VideoStillTestDocument,
): MountedVideoSurface {
  Object.assign(globalThis, { document: doc })
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  return {
    host,
    root,
    async render(element) {
      await act(async () => {
        root.render(element)
      })
    },
    async unmount() {
      await act(async () => {
        root.unmount()
      })
      host.remove()
    },
  }
}

export function videoLeaseFixture(url = "blob:video-fixture") {
  return {
    blob: new Blob([new Uint8Array([0, 0, 0, 1])], { type: "video/webm" }),
    contentHash: "fixture-video-hash",
    url,
    release(): void {},
  }
}

export async function settleReactEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}
