export type VideoWallpaperPresentation =
  | "inactive"
  | "static-still"
  | "playback"

export type VideoStillDimensions = {
  readonly width: number
  readonly height: number
}

export type VideoStillCapture = {
  readonly objectUrl: string
  readonly width: number
  readonly height: number
}

export type VideoStillSource = {
  readonly readyState: number
  readonly videoWidth: number
  readonly videoHeight: number
}

export type CaptureVideoWallpaperStillDependencies = {
  readonly createObjectUrl?: (blob: Blob) => string
  readonly drawStill?: (size: VideoStillDimensions) => Promise<Blob | null>
}

export type VideoStillUrlOwner = {
  beginCapture(): number
  publish(url: string): void
  publishIfCurrent(generation: number, url: string): boolean
  clear(): void
  dispose(): void
  currentUrl(): string | null
}

/** Display still long-edge ceiling: above analysis (64), far below native 4K. */
export const MAX_VIDEO_STILL_DISPLAY_DIMENSION = 1280

/** Analysis-path bound remains separate from display still capture. */
export const MAX_VIDEO_ANALYSIS_DIMENSION = 64

export function videoWallpaperPresentation(
  active: boolean,
  reducedMotion: boolean,
): VideoWallpaperPresentation {
  if (!active) return "inactive"
  return reducedMotion ? "static-still" : "playback"
}

export function shouldPlayVideoWallpaper(
  presentation: VideoWallpaperPresentation,
): boolean {
  return presentation === "playback"
}

export function scaleVideoStillDimensions(
  videoWidth: number,
  videoHeight: number,
  maxDimension: number = MAX_VIDEO_STILL_DISPLAY_DIMENSION,
): VideoStillDimensions {
  if (
    !Number.isFinite(videoWidth) ||
    !Number.isFinite(videoHeight) ||
    !Number.isFinite(maxDimension) ||
    videoWidth <= 0 ||
    videoHeight <= 0 ||
    maxDimension <= 0
  ) {
    return { width: 0, height: 0 }
  }
  const scale = Math.min(1, maxDimension / Math.max(videoWidth, videoHeight))
  return {
    width: Math.max(1, Math.round(videoWidth * scale)),
    height: Math.max(1, Math.round(videoHeight * scale)),
  }
}

export function resolveVideoStillCaptureSize(
  video: VideoStillSource,
  maxDimension: number = MAX_VIDEO_STILL_DISPLAY_DIMENSION,
): VideoStillDimensions {
  if (video.readyState < 2) {
    throw new Error("video has no current frame")
  }
  if (
    !Number.isFinite(video.videoWidth) ||
    !Number.isFinite(video.videoHeight) ||
    video.videoWidth <= 0 ||
    video.videoHeight <= 0
  ) {
    throw new Error("video dimensions are unavailable")
  }
  const size = scaleVideoStillDimensions(
    video.videoWidth,
    video.videoHeight,
    maxDimension,
  )
  if (size.width <= 0 || size.height <= 0) {
    throw new Error("video dimensions are unavailable")
  }
  return size
}

async function drawVideoStillBlob(
  video: CanvasImageSource,
  size: VideoStillDimensions,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas")
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext("2d")
  if (context === null) {
    throw new Error("Canvas2D is unavailable")
  }
  context.drawImage(video, 0, 0, size.width, size.height)
  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png")
  })
}

export async function captureVideoWallpaperStill(
  video: VideoStillSource,
  dependencies: CaptureVideoWallpaperStillDependencies = {},
): Promise<VideoStillCapture> {
  const size = resolveVideoStillCaptureSize(video)
  const drawStill =
    dependencies.drawStill ??
    ((dims) => {
      if (
        typeof HTMLVideoElement !== "undefined" &&
        video instanceof HTMLVideoElement
      ) {
        return drawVideoStillBlob(video, dims)
      }
      throw new Error(
        "still draw path requires an HTMLVideoElement or drawStill",
      )
    })
  const blob = await drawStill(size)
  if (blob === null) {
    throw new Error("still encode failed")
  }
  const createObjectUrl =
    dependencies.createObjectUrl ??
    ((value: Blob) => URL.createObjectURL(value))
  return {
    objectUrl: createObjectUrl(blob),
    width: size.width,
    height: size.height,
  }
}

export function createVideoStillUrlOwner(
  dependencies: {
    readonly revokeObjectUrl?: (url: string) => void
  } = {},
): VideoStillUrlOwner {
  const revoke =
    dependencies.revokeObjectUrl ?? ((url: string) => URL.revokeObjectURL(url))
  let current: string | null = null
  let generation = 0
  let disposed = false

  const release = (url: string | null): void => {
    if (url === null) return
    revoke(url)
  }

  return {
    beginCapture() {
      if (disposed) return generation
      generation += 1
      return generation
    },
    publish(url) {
      if (disposed) {
        release(url)
        return
      }
      if (current === url) return
      const previous = current
      current = url
      release(previous)
    },
    publishIfCurrent(captureGeneration, url) {
      if (disposed || captureGeneration !== generation) {
        release(url)
        return false
      }
      if (current === url) return true
      const previous = current
      current = url
      release(previous)
      return true
    },
    clear() {
      if (disposed) return
      const previous = current
      current = null
      release(previous)
    },
    dispose() {
      if (disposed) return
      disposed = true
      generation += 1
      const previous = current
      current = null
      release(previous)
    },
    currentUrl() {
      return current
    },
  }
}
