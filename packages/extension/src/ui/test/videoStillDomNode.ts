type Listener = EventListenerOrEventListenerObject
export type BlobSettler = (blob: Blob | null) => void

export type VideoStillTestDocumentPort = {
  playCalls: number
  pauseCalls: number
  readonly pendingBlobs: BlobSettler[]
}

export class VideoStillTestNode {
  childNodes: VideoStillTestNode[] = []
  parentNode: VideoStillTestNode | null = null
  textContent = ""
  nodeType = 1
  style: Record<string, string> = {}
  attributes = new Map<string, string>()
  classList = {
    add(): void {},
    remove(): void {},
    contains(): boolean {
      return false
    },
  }
  tagName: string
  ownerDocument: VideoStillTestDocumentPort
  namespaceURI: string | null = "http://www.w3.org/1999/xhtml"
  listeners = new Map<string, Set<Listener>>()
  readyState = 0
  videoWidth = 0
  videoHeight = 0
  paused = true
  muted = false
  loop = false
  playsInline = false
  preload = ""
  src = ""
  poster: string | undefined
  width = 0
  height = 0

  constructor(tag: string, doc: VideoStillTestDocumentPort) {
    this.tagName = tag.toUpperCase()
    this.ownerDocument = doc
  }

  appendChild(node: VideoStillTestNode): VideoStillTestNode {
    node.parentNode = this
    this.childNodes.push(node)
    return node
  }

  removeChild(node: VideoStillTestNode): VideoStillTestNode {
    this.childNodes = this.childNodes.filter((child) => child !== node)
    node.parentNode = null
    return node
  }

  insertBefore(
    node: VideoStillTestNode,
    ref: VideoStillTestNode | null,
  ): VideoStillTestNode {
    if (ref === null) return this.appendChild(node)
    const index = this.childNodes.indexOf(ref)
    node.parentNode = this
    this.childNodes.splice(index < 0 ? this.childNodes.length : index, 0, node)
    return node
  }

  setAttribute(key: string, value: string): void {
    this.attributes.set(key, String(value))
    if (key === "src") this.src = String(value)
  }

  getAttribute(key: string): string | null {
    return this.attributes.get(key) ?? null
  }

  removeAttribute(key: string): void {
    this.attributes.delete(key)
  }

  hasAttribute(key: string): boolean {
    return this.attributes.has(key)
  }

  addEventListener(type: string, listener: Listener): void {
    const bucket = this.listeners.get(type) ?? new Set<Listener>()
    bucket.add(listener)
    this.listeners.set(type, bucket)
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener)
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      if (typeof listener === "function") listener(event)
      else listener.handleEvent(event)
    }
    return true
  }

  get firstChild(): VideoStillTestNode | null {
    return this.childNodes[0] ?? null
  }

  get lastChild(): VideoStillTestNode | null {
    return this.childNodes.at(-1) ?? null
  }

  get nextSibling(): VideoStillTestNode | null {
    if (this.parentNode === null) return null
    const index = this.parentNode.childNodes.indexOf(this)
    return this.parentNode.childNodes[index + 1] ?? null
  }

  get previousSibling(): VideoStillTestNode | null {
    if (this.parentNode === null) return null
    const index = this.parentNode.childNodes.indexOf(this)
    return index > 0 ? (this.parentNode.childNodes[index - 1] ?? null) : null
  }

  get nodeName(): string {
    return this.tagName
  }

  get isConnected(): boolean {
    return this.parentNode !== null
  }

  contains(node: VideoStillTestNode): boolean {
    if (node === this) return true
    return this.childNodes.some((child) => child.contains(node))
  }

  cloneNode(): VideoStillTestNode {
    return new VideoStillTestNode(this.tagName, this.ownerDocument)
  }

  remove(): void {
    this.parentNode?.removeChild(this)
  }

  focus(): void {}
  blur(): void {}

  play(): Promise<void> {
    this.ownerDocument.playCalls += 1
    this.paused = false
    return Promise.resolve()
  }

  pause(): void {
    this.ownerDocument.pauseCalls += 1
    this.paused = true
  }

  getContext(contextId: string): object | null {
    if (contextId !== "2d") return null
    return {
      drawImage(): void {},
      getImageData: (
        _x: number,
        _y: number,
        width: number,
        height: number,
      ) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
    }
  }

  toBlob(callback: BlobSettler): void {
    this.ownerDocument.pendingBlobs.push(callback)
  }

  querySelector(selector: string): VideoStillTestNode | null {
    return this.querySelectorAll(selector)[0] ?? null
  }

  querySelectorAll(selector: string): VideoStillTestNode[] {
    const matches: VideoStillTestNode[] = []
    const visit = (node: VideoStillTestNode): void => {
      if (selector.startsWith("[") && selector.endsWith("]")) {
        const body = selector.slice(1, -1)
        const eq = body.indexOf("=")
        if (eq === -1) {
          if (node.attributes.has(body)) matches.push(node)
        } else {
          const key = body.slice(0, eq)
          const raw = body.slice(eq + 1).replace(/^["']|["']$/g, "")
          if (node.getAttribute(key) === raw) matches.push(node)
        }
      } else if (node.tagName === selector.toUpperCase()) {
        matches.push(node)
      }
      for (const child of node.childNodes) visit(child)
    }
    visit(this)
    return matches
  }
}
