import { probeBlockedExecutables } from "./executableSecurityProbe"
import { createPackagedWorker } from "./packagedWorkerPolicy"

type WorkerProbeResult =
  | { readonly status: "blocked" }
  | { readonly message: string; readonly status: "ran" }

type WorkerUrlResults = {
  readonly alternateExtensionOrigin: boolean
  readonly blob: boolean
  readonly credentials: boolean
  readonly data: boolean
  readonly encodedTraversal: boolean
  readonly fragment: boolean
  readonly http: boolean
  readonly https: boolean
  readonly malformed: boolean
  readonly nonAllowlistedSameOrigin: boolean
  readonly protocolRelative: boolean
  readonly query: boolean
  readonly relative: boolean
  readonly traversal: boolean
}

type BrowserBlockResults = WorkerUrlResults & {
  readonly packagedString: boolean
}

type GenerativeProbeResult = {
  readonly backend: "canvas2d" | "webgl2"
  readonly painted: boolean
}

declare const trustedTypes: {
  createPolicy(
    name: string,
    rules: { readonly createScriptURL: (input: string) => string },
  ): unknown
}

const BLOCKED_WORKER = { status: "blocked" } as const

function observeWorker(
  createWorker: () => Worker,
  expectedMessage: string,
): Promise<WorkerProbeResult> {
  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = createWorker()
    } catch {
      resolve(BLOCKED_WORKER)
      return
    }

    const listeners = new AbortController()
    let completed = false
    const finish = (result: WorkerProbeResult) => {
      if (completed) return
      completed = true
      window.clearTimeout(timeoutId)
      listeners.abort()
      worker.terminate()
      resolve(result)
    }
    const timeoutId = window.setTimeout(() => finish(BLOCKED_WORKER), 1_000)
    worker.addEventListener(
      "message",
      (event) =>
        finish(
          event.data === expectedMessage
            ? { message: event.data, status: "ran" }
            : BLOCKED_WORKER,
        ),
      { signal: listeners.signal },
    )
    worker.addEventListener("error", () => finish(BLOCKED_WORKER), {
      signal: listeners.signal,
    })
  })
}

function workerStringIsBlocked(url: string): boolean {
  try {
    new Worker(url).terminate()
    return false
  } catch {
    return true
  }
}

function policyRejects(url: string): boolean {
  try {
    createPackagedWorker(url).terminate()
    return false
  } catch {
    return true
  }
}

function policyCreationIsBlocked(name: string): boolean {
  try {
    trustedTypes.createPolicy(name, { createScriptURL: (input) => input })
    return false
  } catch {
    return true
  }
}

async function probeGenerativeRenderer(): Promise<GenerativeProbeResult> {
  const { createGenerativeRenderer } = await import(
    "../wallpaper/generativeRenderer"
  )
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 64
  const renderer = createGenerativeRenderer({
    canvas,
    preset: "flow",
    reducedMotion: true,
  })
  renderer.start()
  const pixels = canvas.getContext("2d")?.getImageData(0, 0, 64, 64).data
  const painted = pixels
    ? pixels.some((channel, index) => index % 4 === 3 && channel > 0)
    : false
  const backend = renderer.getBackendKind()
  renderer.dispose()
  return { backend, painted }
}

export async function runWorkerSecurityProbe(): Promise<void> {
  const packagedUrl = `${location.origin}/workers/packaged-worker.js`
  const blobUrl = URL.createObjectURL(
    new Blob(['self.postMessage("blob-worker-ran")'], {
      type: "text/javascript",
    }),
  )
  const urls = {
    alternateExtensionOrigin:
      "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/workers/packaged-worker.js",
    blob: blobUrl,
    credentials: `chrome-extension://user:password@${location.host}/workers/packaged-worker.js`,
    data: 'data:text/javascript,self.postMessage("data-worker-ran")',
    encodedTraversal: `${location.origin}/workers/%2e%2e/packaged-worker.js`,
    fragment: `${packagedUrl}#worker`,
    http: "http://example.com/task6-worker.js",
    https: "https://example.com/task6-worker.js",
    malformed: "chrome-extension://%",
    nonAllowlistedSameOrigin: `${location.origin}/workers/not-packaged.js`,
    protocolRelative: "//example.com/task6-worker.js",
    query: `${packagedUrl}?worker=1`,
    relative: "/workers/packaged-worker.js",
    traversal: `${location.origin}/workers/../workers/packaged-worker.js`,
  } as const satisfies Readonly<Record<keyof WorkerUrlResults, string>>

  const browserBlocks: BrowserBlockResults = {
    alternateExtensionOrigin: workerStringIsBlocked(
      urls.alternateExtensionOrigin,
    ),
    blob: workerStringIsBlocked(urls.blob),
    credentials: workerStringIsBlocked(urls.credentials),
    data: workerStringIsBlocked(urls.data),
    encodedTraversal: workerStringIsBlocked(urls.encodedTraversal),
    fragment: workerStringIsBlocked(urls.fragment),
    http: workerStringIsBlocked(urls.http),
    https: workerStringIsBlocked(urls.https),
    malformed: workerStringIsBlocked(urls.malformed),
    nonAllowlistedSameOrigin: workerStringIsBlocked(
      urls.nonAllowlistedSameOrigin,
    ),
    packagedString: workerStringIsBlocked(packagedUrl),
    protocolRelative: workerStringIsBlocked(urls.protocolRelative),
    query: workerStringIsBlocked(urls.query),
    relative: workerStringIsBlocked(urls.relative),
    traversal: workerStringIsBlocked(urls.traversal),
  }
  const packagedWorker = await observeWorker(
    () => createPackagedWorker(packagedUrl),
    "yindex-packaged-worker-ready",
  )
  const policyRejections: WorkerUrlResults = {
    alternateExtensionOrigin: policyRejects(urls.alternateExtensionOrigin),
    blob: policyRejects(urls.blob),
    credentials: policyRejects(urls.credentials),
    data: policyRejects(urls.data),
    encodedTraversal: policyRejects(urls.encodedTraversal),
    fragment: policyRejects(urls.fragment),
    http: policyRejects(urls.http),
    https: policyRejects(urls.https),
    malformed: policyRejects(urls.malformed),
    nonAllowlistedSameOrigin: policyRejects(urls.nonAllowlistedSameOrigin),
    protocolRelative: policyRejects(urls.protocolRelative),
    query: policyRejects(urls.query),
    relative: policyRejects(urls.relative),
    traversal: policyRejects(urls.traversal),
  }
  const generativeRenderer = await probeGenerativeRenderer()
  const blockedExecutables = await probeBlockedExecutables()
  URL.revokeObjectURL(blobUrl)
  document.documentElement.setAttribute(
    "data-task6-worker-probe",
    JSON.stringify({
      browserBlocks,
      blockedExecutables,
      generativeRenderer,
      packagedWorker,
      policyRejections,
      secondAllowedPolicyBlocked: policyCreationIsBlocked(
        "yindex-packaged-workers",
      ),
      unlistedPolicyBlocked: policyCreationIsBlocked("task6-permissive"),
    }),
  )
}
