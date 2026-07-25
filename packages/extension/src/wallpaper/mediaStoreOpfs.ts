import { FsWriteError } from "./mediaStoreFsTypes"
import type {
  FsDirectoryHandle,
  FsEntry,
  FsFileHandle,
  MediaFs,
  StorageEstimate,
} from "./mediaStoreFsTypes"

export async function createOpfsMediaFs(): Promise<MediaFs> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    throw new DOMException("OPFS unavailable", "NotSupportedError")
  }
  const opfsRoot = await navigator.storage.getDirectory()
  return {
    root: adaptDirectoryHandle(opfsRoot, "opfs"),
    async estimate(): Promise<StorageEstimate> {
      if (!navigator.storage.estimate) return { usage: 0, quota: null }
      const est = await navigator.storage.estimate()
      return { usage: est.usage ?? 0, quota: est.quota ?? null }
    },
  }
}

type AsyncDir = FileSystemDirectoryHandle &
  AsyncIterable<[string, FileSystemHandle]>

function isAsyncIterableDirectory(
  handle: FileSystemDirectoryHandle,
): handle is AsyncDir {
  return Symbol.asyncIterator in handle
}

function adaptDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  name: string,
): FsDirectoryHandle {
  return {
    kind: "directory",
    name,
    async hasEntry(childName) {
      try {
        await handle.getDirectoryHandle(childName)
        return true
      } catch (dirErr) {
        if (
          !(dirErr instanceof DOMException) ||
          dirErr.name !== "NotFoundError"
        ) {
          // may be TypeMismatch if file exists — try file
        }
        try {
          await handle.getFileHandle(childName)
          return true
        } catch (fileErr) {
          if (
            fileErr instanceof DOMException &&
            fileErr.name === "NotFoundError"
          ) {
            return false
          }
          if (
            dirErr instanceof DOMException &&
            dirErr.name === "NotFoundError"
          ) {
            return false
          }
          throw fileErr
        }
      }
    },
    async getDirectory(childName, options) {
      const child = await handle.getDirectoryHandle(childName, {
        create: options?.create ?? false,
      })
      return adaptDirectoryHandle(child, childName)
    },
    async getFile(childName, options) {
      const file = await handle.getFileHandle(childName, {
        create: options?.create ?? false,
      })
      return adaptFileHandle(file, childName)
    },
    async removeEntry(childName, options) {
      await handle.removeEntry(childName, {
        recursive: options?.recursive ?? false,
      })
    },
    async listEntries() {
      const out: FsEntry[] = []
      if (!isAsyncIterableDirectory(handle)) {
        throw new DOMException(
          "Directory listing unsupported",
          "NotSupportedError",
        )
      }
      const iterable: AsyncDir = handle
      for await (const [entryName, entry] of iterable) {
        out.push({
          name: entryName,
          kind: entry.kind === "directory" ? "directory" : "file",
        })
      }
      return out
    },
  }
}

function adaptFileHandle(
  handle: FileSystemFileHandle,
  name: string,
): FsFileHandle {
  return {
    kind: "file",
    name,
    async existsWithData() {
      try {
        const file = await handle.getFile()
        return file.size > 0
      } catch (e) {
        if (e instanceof DOMException && e.name === "NotFoundError")
          return false
        throw e
      }
    },
    async byteLength() {
      return (await handle.getFile()).size
    },
    async writeBytes(data) {
      let writable: FileSystemWritableFileStream
      try {
        writable = await handle.createWritable({ keepExistingData: false })
      } catch (e) {
        throw e instanceof Error
          ? e
          : new DOMException(String(e), "UnknownError")
      }
      const chunk = new Uint8Array(data.byteLength)
      chunk.set(data)
      try {
        await writable.write(chunk)
      } catch (writeErr) {
        try {
          await writable.abort()
        } catch (abortErr) {
          const writeMsg =
            writeErr instanceof Error ? writeErr.message : String(writeErr)
          const abortMsg =
            abortErr instanceof Error ? abortErr.message : String(abortErr)
          throw new FsWriteError(
            "abort",
            `write failed: ${writeMsg}; abort failed: ${abortMsg}`,
            { cause: abortErr },
          )
        }
        if (
          writeErr instanceof DOMException &&
          writeErr.name === "QuotaExceededError"
        ) {
          throw writeErr
        }
        throw new FsWriteError(
          "write",
          writeErr instanceof Error ? writeErr.message : String(writeErr),
          { cause: writeErr },
        )
      }
      try {
        await writable.close()
      } catch (closeErr) {
        if (
          closeErr instanceof DOMException &&
          closeErr.name === "QuotaExceededError"
        ) {
          throw closeErr
        }
        throw new FsWriteError(
          "close",
          closeErr instanceof Error ? closeErr.message : String(closeErr),
          { cause: closeErr },
        )
      }
    },
    async readBytes() {
      const file = await handle.getFile()
      return new Uint8Array(await file.arrayBuffer())
    },
  }
}
