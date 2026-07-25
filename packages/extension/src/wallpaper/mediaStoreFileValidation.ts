import { type Result, err, ok } from "@yindex/domain"
import type { MediaKind, MediaStoreError } from "./mediaStoreTypes"

type SupportedMedia = {
  readonly kind: MediaKind
  readonly mimeType: string
  readonly extensions: readonly string[]
  readonly matches: (bytes: Uint8Array) => boolean
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return (
    bytes.byteLength >= signature.length &&
    signature.every((value, index) => bytes[index] === value)
  )
}

function asciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.byteLength < offset + text.length) return false
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) return false
  }
  return true
}

const SUPPORTED_MEDIA: readonly SupportedMedia[] = [
  {
    kind: "image",
    mimeType: "image/png",
    extensions: ["png"],
    matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]),
  },
  {
    kind: "image",
    mimeType: "image/jpeg",
    extensions: ["jpg", "jpeg"],
    matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  },
  {
    kind: "image",
    mimeType: "image/gif",
    extensions: ["gif"],
    matches: (bytes) =>
      asciiAt(bytes, 0, "GIF87a") || asciiAt(bytes, 0, "GIF89a"),
  },
  {
    kind: "image",
    mimeType: "image/webp",
    extensions: ["webp"],
    matches: (bytes) => asciiAt(bytes, 0, "RIFF") && asciiAt(bytes, 8, "WEBP"),
  },
  {
    kind: "image",
    mimeType: "image/avif",
    extensions: ["avif"],
    matches: (bytes) => asciiAt(bytes, 4, "ftyp") && asciiAt(bytes, 8, "avif"),
  },
  {
    kind: "video",
    mimeType: "video/mp4",
    extensions: ["mp4", "m4v"],
    matches: (bytes) => asciiAt(bytes, 4, "ftyp"),
  },
  {
    kind: "video",
    mimeType: "video/webm",
    extensions: ["webm"],
    matches: (bytes) => startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]),
  },
]

function extensionOf(name: string): string | null {
  const separator = name.lastIndexOf(".")
  if (separator <= 0 || separator === name.length - 1) return null
  return name.slice(separator + 1).toLowerCase()
}

export function isSupportedVideoFilename(name: string): boolean {
  const extension = extensionOf(name)
  return (
    extension !== null &&
    SUPPORTED_MEDIA.some(
      (media) => media.kind === "video" && media.extensions.includes(extension),
    )
  )
}

export function validateMediaFile(input: {
  readonly name: string
  readonly declaredMimeType: string
  readonly bytes: Uint8Array
}): Result<
  { readonly kind: MediaKind; readonly mimeType: string },
  MediaStoreError
> {
  const extension = extensionOf(input.name)
  const byExtension =
    extension === null
      ? undefined
      : SUPPORTED_MEDIA.find((media) => media.extensions.includes(extension))
  const declaredMimeType = input.declaredMimeType.toLowerCase().trim()
  if (
    byExtension === undefined ||
    (declaredMimeType.length > 0 && declaredMimeType !== byExtension.mimeType)
  ) {
    return err({
      code: "unsupported_mime",
      mimeType: input.declaredMimeType,
      message:
        "file extension and declared MIME must identify supported local media",
    })
  }
  if (!byExtension.matches(input.bytes)) {
    return err({
      code: "decode_failed",
      mimeType: byExtension.mimeType,
      message: "file signature does not match its media format",
    })
  }
  return ok({ kind: byExtension.kind, mimeType: byExtension.mimeType })
}

export async function contentHash(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer))
  return [...digest]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
}
