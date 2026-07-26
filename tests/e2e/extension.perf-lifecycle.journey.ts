import type { BrowserContext } from "@playwright/test"
import { profileInteractions } from "./extension.perf-lifecycle.interactions"
import { openProfiledHome } from "./extension.perf-lifecycle.startup"
import type { HomeLifecycleProfile } from "./extension.perf-lifecycle.types"

export async function profileHomeLifecycle(input: {
  readonly context: BrowserContext
  readonly extensionId: string
  readonly runId: string
}): Promise<HomeLifecycleProfile> {
  const home = await openProfiledHome(input)
  try {
    const interactions = await profileInteractions(home)
    return {
      ...interactions,
      coldOpenMs: home.coldOpenMs,
      cspViolations: home.cspViolations,
      traces: { ...home.traces, ...interactions.traces },
      warmOpenMs: home.warmOpenMs,
    }
  } finally {
    await home.session.detach()
    await home.page.close()
  }
}
