import { mkdir, writeFile } from "node:fs/promises"
import {
  arch,
  cpus,
  type as osType,
  platform,
  release,
  totalmem,
} from "node:os"
import { resolve } from "node:path"
import type { CDPSession, Page } from "@playwright/test"
import type { RuntimeHardwareProfile } from "./extension.perf-lifecycle.types"

export const EVIDENCE_ROOT = resolve(
  __dirname,
  "../../.omo/evidence/v0.2.0-liquid-glass-completion/task-26",
)
export const IDLE_WINDOW_MS = 60_000

export type CspViolation = {
  readonly source: "console" | "pageerror" | "security-log"
  readonly text: string
}

export type LifecycleMetrics = {
  readonly domNodes: number
  readonly heapBytes: number
  readonly jsEventListeners: number
}

export type HardwareMetadata = {
  readonly arch: string
  readonly chromium: string
  readonly cpuModel: string
  readonly cpus: number
  readonly devicePixelRatio: number
  readonly gpuRenderer: string
  readonly memGB: number
  readonly osName: string
  readonly osRelease: string
  readonly platform: NodeJS.Platform
  readonly refreshRateHz: number | "unknown"
  readonly refreshRateSampleCount: number
  readonly userAgent: string
  readonly viewport: {
    readonly height: number
    readonly width: number
  }
}

const CSP_PATTERN =
  /content security policy|violat(?:e|es|ed).*directive|refused to (?:load|execute|connect)/i

class LifecycleMetricUnavailableError extends Error {
  override readonly name = "LifecycleMetricUnavailableError"

  constructor(readonly metricName: string) {
    super(`CDP performance metric is unavailable: ${metricName}`)
  }
}

export function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const upper = sorted[middle]
  if (upper === undefined) return 0
  if (sorted.length % 2 === 1) return round(upper)
  const lower = sorted[middle - 1]
  return round(lower === undefined ? upper : (lower + upper) / 2)
}

export function mebibytes(bytes: number): number {
  return round(bytes / (1024 * 1024))
}

export function hardwareMetadata(
  browserVersion: string,
  browserUserAgent: string,
  runtime: RuntimeHardwareProfile,
): HardwareMetadata {
  const processors = cpus()
  return {
    arch: arch(),
    chromium: browserVersion,
    cpuModel: processors[0]?.model ?? "unknown",
    cpus: processors.length,
    devicePixelRatio: runtime.devicePixelRatio,
    gpuRenderer: runtime.gpuRenderer,
    memGB: round(totalmem() / (1024 * 1024 * 1024)),
    osName: osType(),
    osRelease: release(),
    platform: platform(),
    refreshRateHz: runtime.refreshRateHz,
    refreshRateSampleCount: runtime.refreshRateSampleCount,
    userAgent: browserUserAgent,
    viewport: runtime.viewport,
  }
}

export async function activePageId(page: Page): Promise<string> {
  return page
    .locator('[data-page-slot-active="true"] [data-page-id]')
    .getAttribute("data-page-id")
    .then((pageId) => pageId ?? "missing")
}

export async function captureCdpTrace(
  session: CDPSession,
  filename: string,
  action: () => Promise<void>,
): Promise<number> {
  await mkdir(EVIDENCE_ROOT, { recursive: true })
  const traceEvents: object[] = []
  const collectEvents = (event: {
    readonly value: readonly object[]
  }): void => {
    traceEvents.push(...event.value)
  }
  session.on("Tracing.dataCollected", collectEvents)
  await session.send("Tracing.start", {
    categories: "devtools.timeline,blink.user_timing,loading",
    transferMode: "ReportEvents",
  })
  try {
    await action()
  } finally {
    const completed = new Promise<void>((resolveTrace) => {
      session.once("Tracing.tracingComplete", () => resolveTrace())
    })
    await session.send("Tracing.end")
    await completed
    session.off("Tracing.dataCollected", collectEvents)
    await writeFile(
      resolve(EVIDENCE_ROOT, filename),
      `${JSON.stringify({ traceEvents })}\n`,
    )
  }
  return traceEvents.length
}

export function observeCsp(
  page: Page,
  session: CDPSession,
  violations: CspViolation[],
): void {
  page.on("console", (message) => {
    if (CSP_PATTERN.test(message.text())) {
      violations.push({ source: "console", text: message.text() })
    }
  })
  page.on("pageerror", (error) => {
    if (CSP_PATTERN.test(error.message)) {
      violations.push({ source: "pageerror", text: error.message })
    }
  })
  session.on("Log.entryAdded", ({ entry }) => {
    if (entry.source === "security" && CSP_PATTERN.test(entry.text)) {
      violations.push({ source: "security-log", text: entry.text })
    }
  })
}

export async function collectLifecycleMetrics(
  session: CDPSession,
): Promise<LifecycleMetrics> {
  await session.send("HeapProfiler.collectGarbage")
  const { metrics } = await session.send("Performance.getMetrics")
  const metricValue = (name: string): number => {
    const value = metrics.find((metric) => metric.name === name)?.value
    if (value === undefined) throw new LifecycleMetricUnavailableError(name)
    return value
  }
  return {
    domNodes: metricValue("Nodes"),
    heapBytes: metricValue("JSHeapUsedSize"),
    jsEventListeners: metricValue("JSEventListeners"),
  }
}

export async function writeJson(
  filename: string,
  value: unknown,
): Promise<string> {
  await mkdir(EVIDENCE_ROOT, { recursive: true })
  const path = resolve(EVIDENCE_ROOT, filename)
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
  return path
}
