import { performance } from "node:perf_hooks"
import type { BrowserContext } from "@playwright/test"
import {
  type CspViolation,
  captureCdpTrace,
  observeCsp,
  round,
} from "./extension.perf-lifecycle.helpers"
import { waitForProfiledHome } from "./extension.perf-lifecycle.page"
import { installFrameProbe } from "./extension.perf-lifecycle.probe"
import type { ProfiledHome } from "./extension.perf-lifecycle.types"

export async function openProfiledHome(input: {
  readonly context: BrowserContext
  readonly extensionId: string
  readonly runId: string
}): Promise<ProfiledHome> {
  const extensionUrl = `chrome-extension://${input.extensionId}/newtab.html`
  const cspViolations: CspViolation[] = []
  const worker =
    input.context.serviceWorkers()[0] ??
    (await input.context.waitForEvent("serviceworker"))
  await worker.evaluate("chrome.storage.local.clear()")

  const coldPage = await input.context.newPage()
  await coldPage.setViewportSize({ width: 1280, height: 800 })
  await coldPage.emulateMedia({ reducedMotion: "no-preference" })
  await installFrameProbe(coldPage)
  const coldSession = await input.context.newCDPSession(coldPage)
  await coldSession.send("Network.enable")
  await coldSession.send("Network.clearBrowserCache")
  await coldSession.send("Log.enable")
  observeCsp(coldPage, coldSession, cspViolations)
  const coldStartedAt = performance.now()
  const coldTraceEvents = await captureCdpTrace(
    coldSession,
    `cold-newtab-${input.runId}.trace.json`,
    async () => {
      await coldPage.goto(extensionUrl)
      await waitForProfiledHome(coldPage)
    },
  )
  const coldOpenMs = round(performance.now() - coldStartedAt)

  const page = await input.context.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await installFrameProbe(page)
  const session = await input.context.newCDPSession(page)
  await session.send("Log.enable")
  await session.send("Performance.enable")
  observeCsp(page, session, cspViolations)
  const warmStartedAt = performance.now()
  const warmTraceEvents = await captureCdpTrace(
    session,
    `warm-newtab-${input.runId}.trace.json`,
    async () => {
      await page.goto(extensionUrl)
      await waitForProfiledHome(page)
    },
  )
  const warmOpenMs = round(performance.now() - warmStartedAt)
  await coldSession.detach()
  await coldPage.close()

  return {
    coldOpenMs,
    context: input.context,
    cspViolations,
    page,
    runId: input.runId,
    session,
    traces: { coldNewtab: coldTraceEvents, warmNewtab: warmTraceEvents },
    warmOpenMs,
  }
}
