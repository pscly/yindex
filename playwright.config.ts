import { defineConfig } from "@playwright/test"

const PLAYWRIGHT_TIMEOUT_MS = 30_000
const { CI } = process.env

const config = defineConfig({
  expect: { timeout: 5_000 },
  forbidOnly: Boolean(CI),
  fullyParallel: true,
  outputDir: "test-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  retries: CI ? 1 : 0,
  testDir: "tests/e2e",
  timeout: PLAYWRIGHT_TIMEOUT_MS,
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
})

module.exports = config
