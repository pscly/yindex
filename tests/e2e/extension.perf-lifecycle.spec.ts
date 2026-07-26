import { expect, test } from "./extension.fixture"
import { writeJson } from "./extension.perf-lifecycle.helpers"
import { profileHomeLifecycle } from "./extension.perf-lifecycle.journey"
import { restartServiceWorker } from "./extension.perf-lifecycle.restart"
import { createTask26Summary } from "./extension.perf-lifecycle.summary"

test.describe.configure({ mode: "serial" })
test.use({ trace: "off" })
test.setTimeout(900_000)

test("profiles Home lifecycle, Page Turn budgets, CSP, and service-worker recovery", async ({
  extensionContext,
  extensionId,
}, testInfo) => {
  const { TASK_26_RUN_ID: task26RunId } = process.env
  const runId = task26RunId ?? "adhoc"
  const home = await profileHomeLifecycle({
    context: extensionContext,
    extensionId,
    runId,
  })
  const restart = await restartServiceWorker({
    context: extensionContext,
    cspViolations: home.cspViolations,
    extensionId,
  })
  const summary = createTask26Summary({ home, restart, runId })
  const summaryPath = await writeJson("summary.json", summary)
  await writeJson(`profile-${runId}.json`, summary)
  await writeJson(`csp-${runId}.json`, home.cspViolations)
  await testInfo.attach("task-26-summary.json", {
    contentType: "application/json",
    path: summaryPath,
  })

  const failedBudgets = Object.entries(summary.budgets)
    .filter(([, budget]) => !budget.pass)
    .map(([name, budget]) => ({ budget, name }))
  expect(failedBudgets, JSON.stringify(failedBudgets, null, 2)).toEqual([])
})
