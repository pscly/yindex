import { rm } from "node:fs/promises"
import { resolve } from "node:path"
import {
  type BrowserContext,
  type WorkerInfo,
  test as base,
  chromium,
  errors,
} from "@playwright/test"

const { YINDEX_EXTENSION_PATH } = process.env
const repositoryRoot = resolve(__dirname, "../..")
const extensionPath = YINDEX_EXTENSION_PATH
  ? resolve(YINDEX_EXTENSION_PATH)
  : resolve(repositoryRoot, "packages/extension/dist")
const serviceWorkerTimeoutMs = 10_000

type WorkerFixtures = {
  readonly extensionContext: BrowserContext
  readonly extensionId: string
  readonly userDataDir: string
}

class ExtensionLoadError extends Error {
  override readonly name = "ExtensionLoadError"

  constructor(
    readonly distPath: string,
    readonly serviceWorkerUrls: readonly string[],
  ) {
    super(
      `MV3 service worker did not load from ${distPath}. Observed workers: ${serviceWorkerUrls.join(", ") || "none"}. Build the Extension and verify both unpacked load flags are present.`,
    )
  }
}

function profilePath(workerInfo: WorkerInfo): string {
  return resolve(
    workerInfo.project.outputDir,
    "profiles",
    `worker-${workerInfo.workerIndex}`,
  )
}

export const test = base.extend<object, WorkerFixtures>({
  userDataDir: [
    async ({ browserName: _browserName }, use, workerInfo) => {
      const userDataDir = profilePath(workerInfo)
      await rm(userDataDir, { recursive: true, force: true })
      try {
        await use(userDataDir)
      } finally {
        await rm(userDataDir, { recursive: true, force: true })
      }
    },
    { scope: "worker" },
  ],
  extensionContext: [
    async ({ userDataDir }, use) => {
      const context = await chromium.launchPersistentContext(userDataDir, {
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
        channel: "chromium",
        headless: true,
      })
      try {
        await use(context)
      } finally {
        await context.close()
      }
    },
    { scope: "worker" },
  ],
  extensionId: [
    async ({ extensionContext }, use) => {
      const extensionId = await resolveExtensionId(
        extensionContext,
        extensionPath,
        serviceWorkerTimeoutMs,
      )
      await use(extensionId)
    },
    { scope: "worker" },
  ],
})

export async function resolveExtensionId(
  context: BrowserContext,
  distPath: string,
  timeout: number,
): Promise<string> {
  let serviceWorker = context.serviceWorkers()[0]
  if (!serviceWorker) {
    try {
      serviceWorker = await context.waitForEvent("serviceworker", { timeout })
    } catch (error) {
      if (error instanceof errors.TimeoutError) {
        throw new ExtensionLoadError(
          distPath,
          context.serviceWorkers().map((worker) => worker.url()),
        )
      }
      throw error
    }
  }
  return new URL(serviceWorker.url()).host
}

export const expect = test.expect
