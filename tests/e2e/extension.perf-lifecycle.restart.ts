import type { BrowserContext, CDPSession, Page } from "@playwright/test"
import { expect } from "./extension.fixture"
import {
  type CspViolation,
  activePageId,
  observeCsp,
} from "./extension.perf-lifecycle.helpers"

const RESTART_TIMEOUT_MS = 15_000

type WorkerRunningStatus = "stopped" | "starting" | "running" | "stopping"

type WorkerVersion = {
  readonly runningStatus: WorkerRunningStatus
  readonly scriptURL: string
  readonly versionId: string
}

class ServiceWorkerStatusTimeoutError extends Error {
  override readonly name = "ServiceWorkerStatusTimeoutError"

  constructor(
    readonly extensionId: string,
    readonly runningStatus: WorkerRunningStatus,
  ) {
    super(
      `Extension service worker did not reach ${runningStatus} for ${extensionId}`,
    )
  }
}

function waitForWorkerStatus(
  session: CDPSession,
  extensionId: string,
  runningStatus: WorkerRunningStatus,
): Promise<WorkerVersion> {
  return new Promise((resolveWorker, rejectWorker) => {
    const timeout = setTimeout(() => {
      session.off("ServiceWorker.workerVersionUpdated", handleUpdate)
      rejectWorker(
        new ServiceWorkerStatusTimeoutError(extensionId, runningStatus),
      )
    }, RESTART_TIMEOUT_MS)
    const handleUpdate = ({
      versions,
    }: { versions: WorkerVersion[] }): void => {
      const worker = versions.find(
        (version) =>
          version.runningStatus === runningStatus &&
          version.scriptURL.startsWith(`chrome-extension://${extensionId}/`),
      )
      if (worker === undefined) return
      clearTimeout(timeout)
      session.off("ServiceWorker.workerVersionUpdated", handleUpdate)
      resolveWorker(worker)
    }
    session.on("ServiceWorker.workerVersionUpdated", handleUpdate)
  })
}

async function waitForHome(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "设置" })).toBeVisible({
    timeout: RESTART_TIMEOUT_MS,
  })
  await expect(
    page.locator('[data-page-slot-active="true"] [data-page-id]'),
  ).toBeVisible()
}

export type ServiceWorkerRestartProfile = {
  readonly browserUserAgent: string
  readonly browserVersion: string
  readonly reopenedPageId: string
  readonly restarted: boolean
  readonly restartedUrl: string
  readonly stoppedTarget: boolean
}

export async function restartServiceWorker(input: {
  readonly context: BrowserContext
  readonly cspViolations: CspViolation[]
  readonly extensionId: string
}): Promise<ServiceWorkerRestartProfile> {
  const browser = input.context.browser()
  if (browser === null)
    throw new Error("Persistent Chromium browser is missing")
  const page = await input.context.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`chrome-extension://${input.extensionId}/newtab.html`)
  await waitForHome(page)
  const session = await input.context.newCDPSession(page)
  await session.send("Log.enable")
  observeCsp(page, session, input.cspViolations)

  const initialWorkerPromise = waitForWorkerStatus(
    session,
    input.extensionId,
    "running",
  )
  await session.send("ServiceWorker.enable")
  await session.send("ServiceWorker.startWorker", {
    scopeURL: `chrome-extension://${input.extensionId}/`,
  })
  const initialWorker = await initialWorkerPromise
  const stoppedWorkerPromise = waitForWorkerStatus(
    session,
    input.extensionId,
    "stopped",
  )
  await session.send("ServiceWorker.stopWorker", {
    versionId: initialWorker.versionId,
  })
  const stoppedWorker = await stoppedWorkerPromise
  const restartedWorkerPromise = waitForWorkerStatus(
    session,
    input.extensionId,
    "running",
  )
  await session.send("ServiceWorker.startWorker", {
    scopeURL: `chrome-extension://${input.extensionId}/`,
  })
  const restartedWorker = await restartedWorkerPromise

  await page.reload()
  await waitForHome(page)
  const reopenedPageId = await activePageId(page)
  const browserUserAgent = await page.evaluate(() => navigator.userAgent)
  await session.send("ServiceWorker.disable")
  await session.detach()
  await page.close()
  return {
    browserUserAgent,
    browserVersion: browser.version(),
    reopenedPageId,
    restarted:
      stoppedWorker.versionId === restartedWorker.versionId &&
      restartedWorker.runningStatus === "running",
    restartedUrl: restartedWorker.scriptURL,
    stoppedTarget: stoppedWorker.runningStatus === "stopped",
  }
}
