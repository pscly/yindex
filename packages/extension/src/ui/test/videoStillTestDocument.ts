import type {
  BlobSettler,
  VideoStillTestDocumentPort,
} from "./videoStillDomNode"
import { VideoStillTestNode } from "./videoStillDomNode"

export class VideoStillTestDocument implements VideoStillTestDocumentPort {
  body: VideoStillTestNode
  head: VideoStillTestNode
  documentElement: VideoStillTestNode
  visibilityState: DocumentVisibilityState = "visible"
  readyState = "complete"
  defaultView: typeof globalThis
  nodeType = 9
  playCalls = 0
  pauseCalls = 0
  createdUrls: string[] = []
  revokedUrls: string[] = []
  pendingBlobs: BlobSettler[] = []

  constructor() {
    this.body = new VideoStillTestNode("body", this)
    this.head = new VideoStillTestNode("head", this)
    this.documentElement = new VideoStillTestNode("html", this)
    this.documentElement.appendChild(this.head)
    this.documentElement.appendChild(this.body)
    this.defaultView = globalThis
  }

  createElement(tag: string): VideoStillTestNode {
    const node = new VideoStillTestNode(tag, this)
    if (tag.toLowerCase() === "video") {
      node.readyState = 2
      node.videoWidth = 1280
      node.videoHeight = 720
    }
    return node
  }

  createElementNS(_namespace: string, tag: string): VideoStillTestNode {
    return this.createElement(tag)
  }

  createTextNode(text: string): VideoStillTestNode {
    const node = new VideoStillTestNode("#text", this)
    node.nodeType = 3
    node.textContent = text
    return node
  }

  createComment(text: string): VideoStillTestNode {
    const node = new VideoStillTestNode("#comment", this)
    node.nodeType = 8
    node.textContent = text
    return node
  }

  createDocumentFragment(): VideoStillTestNode {
    const node = new VideoStillTestNode("#fragment", this)
    node.nodeType = 11
    return node
  }

  getElementById(): null {
    return null
  }

  get activeElement(): VideoStillTestNode {
    return this.body
  }

  get HTMLIFrameElement(): unknown {
    return globalThis.HTMLIFrameElement
  }

  querySelector(selector: string): VideoStillTestNode | null {
    return this.documentElement.querySelector(selector)
  }

  querySelectorAll(selector: string): VideoStillTestNode[] {
    return this.documentElement.querySelectorAll(selector)
  }

  addEventListener(): void {}
  removeEventListener(): void {}

  settleNextCapture(blob: Blob | null = new Blob([new Uint8Array([1])])): void {
    const settle = this.pendingBlobs.shift()
    if (settle === undefined) throw new Error("no pending still capture")
    settle(blob)
  }

  createObjectUrl(): string {
    const url = `blob:still-${this.createdUrls.length + 1}`
    this.createdUrls.push(url)
    return url
  }

  revokeObjectUrl(url: string): void {
    this.revokedUrls.push(url)
  }
}
