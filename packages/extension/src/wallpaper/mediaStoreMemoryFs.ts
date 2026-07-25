import {
  type FsDirectoryHandle,
  type FsEntry,
  type FsFileHandle,
  FsWriteError,
  type MediaFs,
  type MemoryFsControls,
} from "./mediaStoreFsTypes"

type MemNode =
  | { readonly kind: "file"; readonly bytes: Uint8Array }
  | {
      readonly kind: "directory"
      readonly children: Map<string, MemNode>
    }

function totalBytes(nodes: Map<string, MemNode>): number {
  let sum = 0
  for (const node of nodes.values()) {
    sum +=
      node.kind === "file" ? node.bytes.byteLength : totalBytes(node.children)
  }
  return sum
}

function notFound(): never {
  throw new DOMException("NotFoundError", "NotFoundError")
}

function typeMismatch(): never {
  throw new DOMException("TypeMismatchError", "TypeMismatchError")
}

export function createMemoryFs(options?: {
  readonly quotaBytes?: number
}): { readonly fs: MediaFs; readonly controls: MemoryFsControls } {
  const rootChildren = new Map<string, MemNode>()
  const controls: MemoryFsControls = {
    failNextWriteWithQuota: false,
    failNextWriteWithIo: false,
    failNextReadWithIo: false,
    failNextCloseWithIo: false,
    failNextAbortWithIo: false,
    failNextRemoveWithIo: false,
    failWriteAttemptWithIo: undefined,
    failCloseAttemptWithIo: undefined,
    writeAttempts: 0,
    writeCounts: new Map<string, number>(),
    peakUsage: 0,
  }
  if (options?.quotaBytes !== undefined) {
    controls.quotaBytes = options.quotaBytes
  }

  function trackPeak(): void {
    const usage = totalBytes(rootChildren)
    if (usage > controls.peakUsage) controls.peakUsage = usage
  }

  class MemFile implements FsFileHandle {
    readonly kind = "file" as const

    constructor(
      readonly name: string,
      private readonly parent: Map<string, MemNode>,
    ) {}

    async existsWithData(): Promise<boolean> {
      const node = this.parent.get(this.name)
      return node?.kind === "file" && node.bytes.byteLength > 0
    }

    async byteLength(): Promise<number> {
      const node = this.parent.get(this.name)
      if (!node || node.kind !== "file") notFound()
      return node.bytes.byteLength
    }

    async writeBytes(data: Uint8Array): Promise<void> {
      controls.writeAttempts += 1
      controls.writeCounts.set(
        this.name,
        (controls.writeCounts.get(this.name) ?? 0) + 1,
      )
      if (controls.failWriteAttemptWithIo === controls.writeAttempts) {
        controls.failWriteAttemptWithIo = undefined
        if (controls.failNextAbortWithIo) {
          controls.failNextAbortWithIo = false
          throw new FsWriteError("abort", "write failed; abort failed")
        }
        throw new FsWriteError("write", "write failed")
      }
      if (controls.failNextWriteWithQuota) {
        controls.failNextWriteWithQuota = false
        throw new DOMException("Quota exceeded", "QuotaExceededError")
      }
      if (controls.failNextWriteWithIo) {
        controls.failNextWriteWithIo = false
        if (controls.failNextAbortWithIo) {
          controls.failNextAbortWithIo = false
          throw new FsWriteError("abort", "write failed; abort failed")
        }
        throw new FsWriteError("write", "write failed")
      }
      if (
        controls.failNextCloseWithIo ||
        controls.failCloseAttemptWithIo === controls.writeAttempts
      ) {
        controls.failNextCloseWithIo = false
        controls.failCloseAttemptWithIo = undefined
        throw new FsWriteError("close", "close failed")
      }

      const existing = this.parent.get(this.name)
      const existingSize =
        existing?.kind === "file" ? existing.bytes.byteLength : 0
      if (
        controls.quotaBytes !== undefined &&
        totalBytes(rootChildren) - existingSize + data.byteLength >
          controls.quotaBytes
      ) {
        throw new DOMException("Quota exceeded", "QuotaExceededError")
      }
      this.parent.set(this.name, {
        kind: "file",
        bytes: new Uint8Array(data),
      })
      trackPeak()
    }

    async readBytes(): Promise<Uint8Array> {
      if (controls.failNextReadWithIo) {
        controls.failNextReadWithIo = false
        throw new DOMException("read failed", "UnknownError")
      }
      const node = this.parent.get(this.name)
      if (!node || node.kind !== "file") notFound()
      return new Uint8Array(node.bytes)
    }
  }

  class MemDir implements FsDirectoryHandle {
    readonly kind = "directory" as const

    constructor(
      readonly name: string,
      private readonly children: Map<string, MemNode>,
    ) {}

    async hasEntry(name: string): Promise<boolean> {
      return this.children.has(name)
    }

    async getDirectory(
      name: string,
      options?: { readonly create?: boolean },
    ): Promise<FsDirectoryHandle> {
      const existing = this.children.get(name)
      if (existing) {
        if (existing.kind !== "directory") typeMismatch()
        return new MemDir(name, existing.children)
      }
      if (!options?.create) notFound()
      const children = new Map<string, MemNode>()
      this.children.set(name, { kind: "directory", children })
      return new MemDir(name, children)
    }

    async getFile(
      name: string,
      options?: { readonly create?: boolean },
    ): Promise<FsFileHandle> {
      const existing = this.children.get(name)
      if (existing) {
        if (existing.kind !== "file") typeMismatch()
        return new MemFile(name, this.children)
      }
      if (!options?.create) notFound()
      this.children.set(name, {
        kind: "file",
        bytes: new Uint8Array(0),
      })
      return new MemFile(name, this.children)
    }

    async removeEntry(
      name: string,
      options?: { readonly recursive?: boolean },
    ): Promise<void> {
      if (controls.failNextRemoveWithIo) {
        controls.failNextRemoveWithIo = false
        throw new DOMException("remove failed", "UnknownError")
      }
      const node = this.children.get(name)
      if (!node) notFound()
      if (
        node.kind === "directory" &&
        node.children.size > 0 &&
        !options?.recursive
      ) {
        throw new DOMException(
          "InvalidModificationError",
          "InvalidModificationError",
        )
      }
      this.children.delete(name)
    }

    async listEntries(): Promise<readonly FsEntry[]> {
      const entries: FsEntry[] = []
      for (const [name, node] of this.children) {
        entries.push({ name, kind: node.kind })
      }
      return entries
    }
  }

  return {
    fs: {
      root: new MemDir("root", rootChildren),
      async estimate() {
        return {
          usage: totalBytes(rootChildren),
          quota: controls.quotaBytes ?? null,
        }
      },
    },
    controls,
  }
}
