import { expect, test } from "./extension.fixture"

type WorkerSecurityProbe = {
  readonly blockedExecutables: Readonly<Record<string, boolean>>
  readonly browserBlocks: Readonly<Record<string, boolean>>
  readonly generativeRenderer: {
    readonly backend: "canvas2d" | "webgl2"
    readonly painted: boolean
  }
  readonly packagedWorker:
    | { readonly status: "blocked" }
    | { readonly message: string; readonly status: "ran" }
  readonly policyRejections: Readonly<Record<string, boolean>>
  readonly secondAllowedPolicyBlocked: boolean
  readonly unlistedPolicyBlocked: boolean
}

test("allows only the packaged Worker from packaged page code", async ({
  extensionContext,
  extensionId,
}, testInfo) => {
  // Given: the real new-tab bootstrap running as packaged Extension code
  const page = await extensionContext.newPage()
  await page.goto(
    `chrome-extension://${extensionId}/newtab.html?task6-worker-probe=1`,
  )

  // When: packaged code tries each raw URL class, then requests the sole
  // allowlisted URL through the finite Trusted Types policy
  await expect(page.locator("html")).toHaveAttribute(
    "data-task6-worker-probe",
    /\{.*\}/,
  )
  const serializedProbe = await page
    .locator("html")
    .getAttribute("data-task6-worker-probe")
  const probe = JSON.parse(serializedProbe ?? "null") as WorkerSecurityProbe
  await testInfo.attach("task-6-worker-policy-probe.json", {
    body: JSON.stringify(probe, null, 2),
    contentType: "application/json",
  })

  // Then: the approved packaged Worker runs and every untrusted URL class is blocked
  expect(probe).toEqual({
    blockedExecutables: {
      blobScript: true,
      eval: true,
      inlineScript: true,
      remoteScript: true,
      stringTimer: true,
    },
    browserBlocks: {
      alternateExtensionOrigin: true,
      blob: true,
      credentials: true,
      data: true,
      encodedTraversal: true,
      fragment: true,
      http: true,
      https: true,
      malformed: true,
      nonAllowlistedSameOrigin: true,
      packagedString: true,
      protocolRelative: true,
      query: true,
      relative: true,
      traversal: true,
    },
    generativeRenderer: {
      backend: "webgl2",
      painted: true,
    },
    packagedWorker: {
      message: "yindex-packaged-worker-ready",
      status: "ran",
    },
    policyRejections: {
      alternateExtensionOrigin: true,
      blob: true,
      credentials: true,
      data: true,
      encodedTraversal: true,
      fragment: true,
      http: true,
      https: true,
      malformed: true,
      nonAllowlistedSameOrigin: true,
      protocolRelative: true,
      query: true,
      relative: true,
      traversal: true,
    },
    secondAllowedPolicyBlocked: true,
    unlistedPolicyBlocked: true,
  })
})
