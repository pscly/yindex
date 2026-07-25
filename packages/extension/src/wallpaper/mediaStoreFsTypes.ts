export type FsEntryKind = "file" | "directory"

export type FsEntry = {
  readonly name: string
  readonly kind: FsEntryKind
}

export type FsFileHandle = {
  readonly kind: "file"
  readonly name: string
  writeBytes(data: Uint8Array): Promise<void>
  readBytes(): Promise<Uint8Array>
  byteLength(): Promise<number>
  existsWithData(): Promise<boolean>
}

export class FsWriteError extends Error {
  override readonly name = "FsWriteError"

  constructor(
    readonly operation: "write" | "close" | "abort",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}

export type FsDirectoryHandle = {
  readonly kind: "directory"
  readonly name: string
  getDirectory(
    name: string,
    options?: { readonly create?: boolean },
  ): Promise<FsDirectoryHandle>
  getFile(
    name: string,
    options?: { readonly create?: boolean },
  ): Promise<FsFileHandle>
  removeEntry(
    name: string,
    options?: { readonly recursive?: boolean },
  ): Promise<void>
  listEntries(): Promise<readonly FsEntry[]>
  hasEntry(name: string): Promise<boolean>
}

export type StorageEstimate = {
  readonly usage: number
  readonly quota: number | null
}

export type MediaFs = {
  readonly root: FsDirectoryHandle
  estimate(): Promise<StorageEstimate>
}

/** Mutable fault controls; mutation is the fake's test interface. */
export type MemoryFsControls = {
  quotaBytes?: number
  failNextWriteWithQuota: boolean
  failNextWriteWithIo: boolean
  failNextReadWithIo: boolean
  failNextCloseWithIo: boolean
  failNextAbortWithIo: boolean
  failNextRemoveWithIo: boolean
  failWriteAttemptWithIo: number | undefined
  failCloseAttemptWithIo: number | undefined
  writeAttempts: number
  readonly writeCounts: Map<string, number>
  peakUsage: number
}
