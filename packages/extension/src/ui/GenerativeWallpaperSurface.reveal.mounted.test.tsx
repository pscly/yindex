import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { act, createElement } from "react"
import {
  Fake2DContext,
  FakeGLContext,
} from "../wallpaper/generativeRendererTestSupport"
import { GenerativeWallpaperSurface } from "./GenerativeWallpaperSurface"
import {
  type MountedVideoSurface,
  installVideoStillTestDom,
  mountVideoSurface,
} from "./test/videoStillDomHarness"
import { VideoStillTestNode } from "./test/videoStillDomNode"
import type { VideoStillTestDocument } from "./test/videoStillTestDocument"

type SurfaceEvent = {
  readonly kind: "draw" | "visible-set"
  readonly node: VideoStillTestNode
}

type ContextMode = "webgl2-ok" | "webgl2-fails"

const originalGetContext = VideoStillTestNode.prototype.getContext
const originalSetAttribute = VideoStillTestNode.prototype.setAttribute

function roleOf(node: VideoStillTestNode): string {
  return node.getAttribute("data-wallpaper-surface") ?? "unknown"
}

function surfaceOf(
  doc: VideoStillTestDocument,
  role: string,
): {
  readonly visibleAttr: string | null
  readonly visibility: string
} {
  const node = doc.querySelector(`[data-wallpaper-surface="${role}"]`)
  if (node === null) throw new Error(`missing ${role} canvas`)
  return {
    visibleAttr: node.getAttribute("data-wallpaper-surface-visible"),
    visibility: node.style.visibility ?? "",
  }
}

describe("GenerativeWallpaperSurface initial reveal", () => {
  let doc: VideoStillTestDocument
  let events: SurfaceEvent[] = []
  let loseContextCalls: { value: number }
  let glContexts: FakeGLContext[]
  let twoDContexts: Fake2DContext[]

  beforeEach(() => {
    doc = installVideoStillTestDom()
    events = []
    loseContextCalls = { value: 0 }
    glContexts = []
    twoDContexts = []
    Object.assign(globalThis, {
      ResizeObserver: class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    })
    Object.assign(VideoStillTestNode.prototype, {
      getBoundingClientRect: () => ({ width: 1280, height: 800 }),
    })
  })

  afterEach(() => {
    VideoStillTestNode.prototype.getContext = originalGetContext
    VideoStillTestNode.prototype.setAttribute = originalSetAttribute
    Reflect.deleteProperty(
      VideoStillTestNode.prototype,
      "getBoundingClientRect",
    )
    Reflect.deleteProperty(globalThis, "ResizeObserver")
  })

  function record(event: SurfaceEvent): void {
    // Cap the log: ordering assertions only need the first draw/reveal entries,
    // while the live rAF loop would otherwise append one draw per tick forever.
    if (events.length < 64) events.push(event)
  }

  function installCanvasSeam(mode: ContextMode): void {
    const perNode = new WeakMap<
      VideoStillTestNode,
      { gl?: FakeGLContext; twoD?: Fake2DContext }
    >()
    VideoStillTestNode.prototype.getContext = function (
      this: VideoStillTestNode,
      contextId: string,
    ): object | null {
      const entry = perNode.get(this) ?? {}
      perNode.set(this, entry)
      if (contextId === "webgl2") {
        if (mode === "webgl2-fails") return null
        if (entry.gl === undefined) {
          const gl = new FakeGLContext(loseContextCalls)
          gl.drawArrays = () => {
            record({ kind: "draw", node: this })
            FakeGLContext.prototype.drawArrays.call(gl)
          }
          entry.gl = gl
          glContexts.push(gl)
        }
        return entry.gl
      }
      if (contextId === "2d") {
        if (entry.twoD === undefined) {
          const ctx = new Fake2DContext()
          ctx.fillRect = () => {
            record({ kind: "draw", node: this })
            Fake2DContext.prototype.fillRect.call(ctx)
          }
          entry.twoD = ctx
          twoDContexts.push(ctx)
        }
        return entry.twoD
      }
      return null
    }
    VideoStillTestNode.prototype.setAttribute = function (
      this: VideoStillTestNode,
      key: string,
      value: string,
    ): void {
      if (key === "data-wallpaper-surface-visible") {
        record({ kind: "visible-set", node: this })
      }
      originalSetAttribute.call(this, key, value)
    }
  }

  async function renderSurface(
    mounted: MountedVideoSurface,
    active: boolean,
  ): Promise<void> {
    await act(async () => {
      await mounted.render(
        createElement(GenerativeWallpaperSurface, {
          preset: "moment",
          active,
          reducedMotion: false,
          onAnalysis: () => {},
        }),
      )
    })
  }

  test("both canvases stay hidden until the first successful draw reveals only the WebGL surface", async () => {
    // Given a real mounted surface whose backend has not drawn yet (inactive)
    installCanvasSeam("webgl2-ok")
    const mounted = mountVideoSurface(doc)
    await renderSurface(mounted, false)

    // Then neither canvas advertises a visible surface and both styles hide
    expect(surfaceOf(doc, "webgl2")).toEqual({
      visibleAttr: null,
      visibility: "hidden",
    })
    expect(surfaceOf(doc, "canvas2d")).toEqual({
      visibleAttr: null,
      visibility: "hidden",
    })
    expect(events).toEqual([])

    // When activation lets the renderer complete its first successful draw
    await renderSurface(mounted, true)

    // Then the drawn WebGL surface becomes visible while the fallback stays hidden
    expect(glContexts.length).toBeGreaterThan(0)
    expect(glContexts[0]?.drawArraysCalls).toBeGreaterThan(0)
    expect(surfaceOf(doc, "webgl2")).toEqual({
      visibleAttr: "true",
      visibility: "visible",
    })
    expect(surfaceOf(doc, "canvas2d")).toEqual({
      visibleAttr: null,
      visibility: "hidden",
    })
    const firstDraw = events.findIndex(
      (event) => event.kind === "draw" && roleOf(event.node) === "webgl2",
    )
    const firstReveal = events.findIndex(
      (event) =>
        event.kind === "visible-set" && roleOf(event.node) === "webgl2",
    )
    expect(firstDraw).toBeGreaterThanOrEqual(0)
    expect(firstReveal).toBeGreaterThan(firstDraw)
    await mounted.unmount()
    expect(loseContextCalls.value).toBe(0)
  })

  test("a failing WebGL init never exposes the GL surface; the Canvas2D fallback is revealed only after its own draw", async () => {
    // Given a real mounted surface whose webgl2 context request fails
    installCanvasSeam("webgl2-fails")
    const mounted = mountVideoSurface(doc)
    await renderSurface(mounted, true)

    // Then the fallback drew and only its canvas is visible
    expect(twoDContexts.length).toBeGreaterThan(0)
    expect(twoDContexts[0]?.fillRectCalls).toBeGreaterThan(0)
    expect(surfaceOf(doc, "canvas2d")).toEqual({
      visibleAttr: "true",
      visibility: "visible",
    })
    expect(surfaceOf(doc, "webgl2")).toEqual({
      visibleAttr: null,
      visibility: "hidden",
    })

    // And the GL canvas was never marked visible at any point, even transiently
    expect(
      events.filter(
        (event) =>
          event.kind === "visible-set" && roleOf(event.node) === "webgl2",
      ),
    ).toEqual([])
    const firstFallbackDraw = events.findIndex(
      (event) => event.kind === "draw" && roleOf(event.node) === "canvas2d",
    )
    const firstFallbackReveal = events.findIndex(
      (event) =>
        event.kind === "visible-set" && roleOf(event.node) === "canvas2d",
    )
    expect(firstFallbackDraw).toBeGreaterThanOrEqual(0)
    expect(firstFallbackReveal).toBeGreaterThan(firstFallbackDraw)
    await mounted.unmount()
  })
})
