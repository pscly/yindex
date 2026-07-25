import type { PixelFrame } from "./wallpaperAnalyzer"

const MAX_VIDEO_ANALYSIS_DIMENSION = 64

export class WallpaperVideoFrameError extends Error {
  override readonly name = "WallpaperVideoFrameError"
}

export async function captureWallpaperVideoFrame(
  video: HTMLVideoElement,
): Promise<PixelFrame> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    throw new WallpaperVideoFrameError("video has no current frame")
  }
  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    throw new WallpaperVideoFrameError("video dimensions are unavailable")
  }

  const scale = Math.min(
    1,
    MAX_VIDEO_ANALYSIS_DIMENSION /
      Math.max(video.videoWidth, video.videoHeight),
  )
  const width = Math.max(1, Math.round(video.videoWidth * scale))
  const height = Math.max(1, Math.round(video.videoHeight * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (context === null) {
    throw new WallpaperVideoFrameError("Canvas2D is unavailable")
  }
  context.drawImage(video, 0, 0, width, height)
  const image = context.getImageData(0, 0, width, height)
  return { width, height, data: image.data }
}
