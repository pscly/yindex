import { expect } from "bun:test"
import { createMediaStore, createMemoryFs } from "./mediaStore"

export function makeFile(input: {
  readonly name: string
  readonly type: string
  readonly bytes: Uint8Array
}): File {
  if (input.bytes.byteLength === 0) {
    return new File([], input.name, { type: input.type })
  }
  const extension = input.name.split(".").at(-1)?.toLowerCase()
  const signature =
    extension === "png"
      ? new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      : extension === "jpg" || extension === "jpeg"
        ? new Uint8Array([0xff, 0xd8, 0xff])
        : undefined
  let copy: Uint8Array
  if (extension === "mp4" || extension === "m4v") {
    copy = new Uint8Array(Math.max(input.bytes.byteLength, 8))
    copy.set(input.bytes)
    copy.set(new TextEncoder().encode("ftyp"), 4)
  } else if (
    signature !== undefined &&
    input.bytes.byteLength < signature.byteLength
  ) {
    copy = new Uint8Array(signature.byteLength + input.bytes.byteLength)
    copy.set(signature)
    copy.set(input.bytes, signature.byteLength)
  } else {
    copy = new Uint8Array(input.bytes)
    if (signature !== undefined) copy.set(signature)
  }
  const buffer = new ArrayBuffer(copy.byteLength)
  new Uint8Array(buffer).set(copy)
  const blob = new Blob([buffer], { type: input.type })
  return new File([blob], input.name, { type: input.type })
}

export async function openStore(opts?: {
  readonly quotaBytes?: number
  readonly now?: () => number
  readonly createId?: () => string
  readonly fs?: ReturnType<typeof createMemoryFs>["fs"]
}) {
  const mem =
    opts?.fs !== undefined
      ? {
          fs: opts.fs,
          controls: {
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
          },
        }
      : createMemoryFs(
          opts?.quotaBytes !== undefined
            ? { quotaBytes: opts.quotaBytes }
            : undefined,
        )
  const created =
    opts?.now !== undefined && opts?.createId !== undefined
      ? await createMediaStore({
          fs: mem.fs,
          now: opts.now,
          createId: opts.createId,
        })
      : opts?.now !== undefined
        ? await createMediaStore({ fs: mem.fs, now: opts.now })
        : opts?.createId !== undefined
          ? await createMediaStore({ fs: mem.fs, createId: opts.createId })
          : await createMediaStore({ fs: mem.fs })
  expect(created.ok).toBe(true)
  if (!created.ok) throw new Error("store open failed")
  return { store: created.value, fs: mem.fs, controls: mem.controls }
}
