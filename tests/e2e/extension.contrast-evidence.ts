import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Locator, Page } from "@playwright/test"
import { PNG } from "pngjs"
import { contrastRatio } from "../../packages/domain/src/style/adaptiveContrast"
import { SCREENSHOT_ROOT } from "./extension.visual-harness"

type Rgb = {
  readonly red: number
  readonly green: number
  readonly blue: number
}

export type ContrastSample = {
  readonly id: string
  readonly kind: "text" | "non-text"
  readonly fixture: string
  readonly profile: string
  readonly foreground: string
  readonly background: string
  readonly ratio: number
  readonly floor: number
  readonly pass: boolean
  readonly screenshot: string
  readonly backgroundScreenshot: string
  readonly method: string
}

type SampleInput = {
  readonly id: string
  readonly fixture: string
  readonly profile: string
  readonly floor: number
}

type ClipBox = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

function channelToLinear(channel: number): number {
  const srgb = channel / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

function luminance(color: Rgb): number {
  return (
    0.2126 * channelToLinear(color.red) +
    0.7152 * channelToLinear(color.green) +
    0.0722 * channelToLinear(color.blue)
  )
}

function hex(color: Rgb): string {
  return `#${[color.red, color.green, color.blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`
}

function pixelAt(png: PNG, x: number, y: number): Rgb {
  const safeX = Math.min(png.width - 1, Math.max(0, Math.round(x)))
  const safeY = Math.min(png.height - 1, Math.max(0, Math.round(y)))
  const offset = (safeY * png.width + safeX) * 4
  return {
    red: png.data[offset] ?? 0,
    green: png.data[offset + 1] ?? 0,
    blue: png.data[offset + 2] ?? 0,
  }
}

async function clipAround(page: Page, box: ClipBox): Promise<ClipBox> {
  const viewport = page.viewportSize()
  if (viewport === null) throw new TypeError("Viewport is unavailable")
  const pad = 8
  const x = Math.max(0, Math.floor(box.x - pad))
  const y = Math.max(0, Math.floor(box.y - pad))
  const right = Math.min(viewport.width, Math.ceil(box.x + box.width + pad))
  const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height + pad))
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  }
}

async function saveClippedScreenshot(
  page: Page,
  name: string,
  clip: ClipBox,
): Promise<Buffer> {
  return page.screenshot({
    animations: "disabled",
    path: resolve(SCREENSHOT_ROOT, name),
    scale: "css",
    clip,
  })
}

async function withHiddenTarget<T>(
  target: Locator,
  operation: () => Promise<T>,
): Promise<T> {
  const handle = await target.elementHandle()
  if (handle === null) {
    throw new TypeError("Contrast target handle is unavailable")
  }
  const previousVisibility = await handle.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError("Contrast target must be an HTMLElement")
    }
    const previous = element.style.visibility
    element.style.visibility = "hidden"
    return previous
  })
  try {
    return await operation()
  } finally {
    try {
      await handle.evaluate((element, visibility) => {
        if (!(element instanceof HTMLElement)) return
        element.style.visibility = visibility
      }, previousVisibility)
    } catch {
    } finally {
      await handle.dispose().catch(() => undefined)
    }
  }
}

async function computedTextColor(target: Locator): Promise<Rgb> {
  return target.evaluate((element) => {
    const cssColor = getComputedStyle(element).color
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext("2d")
    if (context === null) throw new TypeError("Canvas2D is unavailable")
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = cssColor
    context.fillRect(0, 0, 1, 1)
    const data = context.getImageData(0, 0, 1, 1).data
    return {
      red: data[0] ?? 0,
      green: data[1] ?? 0,
      blue: data[2] ?? 0,
    }
  })
}

function lowestContrastBackground(
  png: PNG,
  localBox: ClipBox,
  foreground: Rgb,
): { readonly color: Rgb; readonly ratio: number } {
  let result = {
    color: pixelAt(
      png,
      localBox.x + localBox.width / 2,
      localBox.y + localBox.height / 2,
    ),
    ratio: Number.POSITIVE_INFINITY,
  }
  for (let row = 1; row <= 5; row += 1) {
    for (let column = 1; column <= 9; column += 1) {
      const color = pixelAt(
        png,
        localBox.x + (localBox.width * column) / 10,
        localBox.y + (localBox.height * row) / 6,
      )
      const ratio = contrastRatio(luminance(foreground), luminance(color))
      if (ratio < result.ratio) result = { color, ratio }
    }
  }
  return result
}

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.max(
    Math.abs(a.red - b.red),
    Math.abs(a.green - b.green),
    Math.abs(a.blue - b.blue),
  )
}

function bestDifferingControlContrast(
  actual: PNG,
  hidden: PNG,
): {
  readonly foreground: Rgb
  readonly background: Rgb
  readonly ratio: number
} {
  let best = {
    foreground: pixelAt(actual, actual.width / 2, actual.height / 2),
    background: pixelAt(hidden, hidden.width / 2, hidden.height / 2),
    ratio: 0,
  }
  const step = Math.max(
    1,
    Math.floor(Math.min(actual.width, actual.height) / 12),
  )
  for (let y = 0; y < actual.height; y += step) {
    for (let x = 0; x < actual.width; x += step) {
      const foreground = pixelAt(actual, x, y)
      const background = pixelAt(hidden, x, y)
      if (colorDistance(foreground, background) < 18) continue
      const ratio = contrastRatio(luminance(foreground), luminance(background))
      if (ratio > best.ratio) best = { foreground, background, ratio }
    }
  }
  if (best.ratio === 0) {
    const foreground = pixelAt(actual, actual.width / 2, actual.height / 2)
    const background = pixelAt(hidden, hidden.width / 2, hidden.height / 2)
    return {
      foreground,
      background,
      ratio: contrastRatio(luminance(foreground), luminance(background)),
    }
  }
  return best
}

export async function measureTextContrast(
  page: Page,
  target: Locator,
  input: SampleInput,
): Promise<ContrastSample> {
  const box = await target.boundingBox()
  if (box === null) throw new TypeError(`Missing contrast target: ${input.id}`)
  const clip = await clipAround(page, box)
  const localBox = {
    x: box.x - clip.x,
    y: box.y - clip.y,
    width: box.width,
    height: box.height,
  }
  const foreground = await computedTextColor(target)
  const screenshot = `contrast-${input.id}.png`
  const backgroundScreenshot = `contrast-${input.id}-background.png`
  await saveClippedScreenshot(page, screenshot, clip)
  const backgroundBuffer = await withHiddenTarget(target, () =>
    saveClippedScreenshot(page, backgroundScreenshot, clip),
  )
  const result = lowestContrastBackground(
    PNG.sync.read(backgroundBuffer),
    localBox,
    foreground,
  )
  const ratio = Number(result.ratio.toFixed(3))
  return {
    ...input,
    kind: "text",
    foreground: hex(foreground),
    background: hex(result.color),
    ratio,
    pass: ratio >= input.floor,
    screenshot,
    backgroundScreenshot,
    method:
      "Computed foreground converted by Canvas2D to sRGB; minimum WCAG ratio against a 9×5 grid of composited pixels from a target-hidden clipped screenshot.",
  }
}

export async function measureNonTextContrast(
  page: Page,
  target: Locator,
  input: SampleInput,
): Promise<ContrastSample> {
  const box = await target.boundingBox()
  if (box === null) throw new TypeError(`Missing contrast target: ${input.id}`)
  const clip = await clipAround(page, box)
  const screenshot = `contrast-${input.id}.png`
  const backgroundScreenshot = `contrast-${input.id}-background.png`
  const actual = PNG.sync.read(
    await saveClippedScreenshot(page, screenshot, clip),
  )
  const hidden = PNG.sync.read(
    await withHiddenTarget(target, () =>
      saveClippedScreenshot(page, backgroundScreenshot, clip),
    ),
  )
  const pair = bestDifferingControlContrast(actual, hidden)
  const foreground = pair.foreground
  const background = pair.background
  const ratio = Number(pair.ratio.toFixed(3))
  return {
    ...input,
    kind: "non-text",
    foreground: hex(foreground),
    background: hex(background),
    ratio,
    pass: ratio >= input.floor,
    screenshot,
    backgroundScreenshot,
    method:
      "Clipped composited control vs target-hidden screenshot; highest WCAG ratio among pixels where the control paint differs from the underlying composite.",
  }
}

export async function writeContrastEvidence(
  outputPath: string,
  samples: readonly ContrastSample[],
): Promise<void> {
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt: "2026-07-26",
        standard: "WCAG 2.x relative luminance and contrast ratio",
        lighthouseUsedAsConformance: false,
        textFloor: 4.5,
        nonTextFloor: 3,
        sampleCount: samples.length,
        passed: samples.every((sample) => sample.pass),
        samples,
      },
      null,
      2,
    )}\n`,
  )
}
