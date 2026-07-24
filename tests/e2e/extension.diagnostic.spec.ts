import { rm } from "node:fs/promises"
import { chromium } from "@playwright/test"
import { expect, resolveExtensionId, test } from "./extension.fixture"

test("diagnoses a Chromium context launched without Extension flags", async ({
  browserName: _browserName,
}, testInfo) => {
  // Given: a fresh persistent Chromium context without unpacked load flags
  const userDataDir = testInfo.outputPath("profile-without-extension")
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
  })

  try {
    // When: the harness attempts to resolve the expected MV3 worker
    const extensionId = resolveExtensionId(context, "flags-not-supplied", 500)

    // Then: the failure explains the missing worker and load flags
    await expect(extensionId).rejects.toThrow(
      /MV3 service worker did not load.*Observed workers: none.*unpacked load flags/,
    )
  } finally {
    await context.close()
    await rm(userDataDir, { recursive: true, force: true })
  }
})
