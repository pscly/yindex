type WallpaperRevealEvent = {
  readonly canvas: number
  readonly kind: "draw" | "visible"
  readonly role: string | null
}

type WallpaperCanvasContextRequest = {
  readonly role: string | null
  readonly contextId: string
}

declare global {
  interface Window {
    __revealSequence?: WallpaperRevealEvent[]
    __canvasContextRequests?: WallpaperCanvasContextRequest[]
  }
}

export function installWallpaperCanvasInstrumentation(): void {
  const sequence: WallpaperRevealEvent[] = []
  window.__revealSequence = sequence
  const requests: WallpaperCanvasContextRequest[] = []
  window.__canvasContextRequests = requests
  const canvasIds = new WeakMap<HTMLCanvasElement, number>()
  let nextCanvasId = 1
  const idOf = (canvas: HTMLCanvasElement): number => {
    const existing = canvasIds.get(canvas)
    if (existing !== undefined) return existing
    const id = nextCanvasId
    nextCanvasId += 1
    canvasIds.set(canvas, id)
    return id
  }
  const nativeSetAttribute = Element.prototype.setAttribute
  function trackedSetAttribute(
    this: Element,
    key: string,
    value: string,
  ): void {
    if (
      key === "data-wallpaper-surface-visible" &&
      this instanceof HTMLCanvasElement
    ) {
      sequence.push({
        canvas: idOf(this),
        kind: "visible",
        role: this.getAttribute("data-wallpaper-surface"),
      })
    }
    Reflect.apply(nativeSetAttribute, this, [key, value])
  }
  Object.defineProperty(Element.prototype, "setAttribute", {
    configurable: true,
    value: trackedSetAttribute,
    writable: true,
  })
  const nativeDrawArrays = WebGL2RenderingContext.prototype.drawArrays
  function trackedDrawArrays(
    this: WebGL2RenderingContext,
    mode: number,
    first: number,
    count: number,
  ): void {
    const source = this.canvas
    if (source instanceof HTMLCanvasElement) {
      sequence.push({
        canvas: idOf(source),
        kind: "draw",
        role: source.getAttribute("data-wallpaper-surface"),
      })
    }
    Reflect.apply(nativeDrawArrays, this, [mode, first, count])
  }
  Object.defineProperty(WebGL2RenderingContext.prototype, "drawArrays", {
    configurable: true,
    value: trackedDrawArrays,
    writable: true,
  })
  const nativeFillRect = CanvasRenderingContext2D.prototype.fillRect
  function trackedFillRect(
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    sequence.push({
      canvas: idOf(this.canvas),
      kind: "draw",
      role: this.canvas.getAttribute("data-wallpaper-surface"),
    })
    Reflect.apply(nativeFillRect, this, [x, y, width, height])
  }
  Object.defineProperty(CanvasRenderingContext2D.prototype, "fillRect", {
    configurable: true,
    value: trackedFillRect,
    writable: true,
  })
  const nativeGetContext = HTMLCanvasElement.prototype.getContext
  function trackedGetContext(
    this: HTMLCanvasElement,
    contextId: string,
    ...rest: unknown[]
  ): unknown {
    requests.push({
      contextId,
      role: this.getAttribute("data-wallpaper-surface"),
    })
    return Reflect.apply(nativeGetContext, this, [contextId, ...rest])
  }
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: trackedGetContext,
    writable: true,
  })
}
