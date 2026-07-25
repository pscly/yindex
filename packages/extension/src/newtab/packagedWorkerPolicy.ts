const PACKAGED_WORKER_PATHS = ["/workers/packaged-worker.js"] as const
const trustedWorkerUrls = new Set(
  PACKAGED_WORKER_PATHS.map((path) => new URL(path, location.origin).href),
)

declare const trustedTypes: {
  createPolicy(
    name: "yindex-packaged-workers",
    rules: { readonly createScriptURL: (input: string) => string },
  ): { readonly createScriptURL: (input: string) => string }
}

const packagedWorkerPolicy = trustedTypes.createPolicy(
  "yindex-packaged-workers",
  {
    createScriptURL(input) {
      if (!trustedWorkerUrls.has(input)) {
        throw new TypeError("Worker URL is not a packaged yindex Worker")
      }
      return input
    },
  },
)

export function createPackagedWorker(url: string): Worker {
  return new Worker(packagedWorkerPolicy.createScriptURL(url))
}
