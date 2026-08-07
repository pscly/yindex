import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { z } from "zod"

const repositoryRoot = resolve(import.meta.dir, "../../..")

const manifestSchema = z.object({
  key: z.never().optional(),
  minimum_chrome_version: z.string(),
  permissions: z.array(z.string()),
  sandbox: z.never().optional(),
  content_security_policy: z.object({
    extension_pages: z.string(),
    sandbox: z.never().optional(),
  }),
})

const packageSchema = z.object({
  dependencies: z.record(z.string()),
})

function readText(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), "utf8")
}

function parseCspDirectives(
  csp: string,
): Readonly<Record<string, readonly string[]>> {
  return Object.fromEntries(
    csp
      .split(";")
      .map((directive) => directive.trim())
      .filter((directive) => directive.length > 0)
      .map((directive) => {
        const [name, ...sources] = directive.split(/\s+/)
        return [name, sources]
      }),
  )
}

describe("Task 6 release contract", () => {
  test("keeps existing MV3 permissions and grants unlimited local storage plus local favicons", () => {
    // Given: the installable Extension manifest
    const manifest = manifestSchema.parse(
      JSON.parse(readText("packages/extension/public/manifest.json")),
    )

    // When: its permissions and Chrome floor are inspected
    const requiredPermissions = [
      "storage",
      "bookmarks",
      "alarms",
      "notifications",
      "unlimitedStorage",
      "favicon",
    ]

    // Then: Task 6 adds storage capacity without dropping the existing grants
    expect(manifest.permissions).toEqual(requiredPermissions)
    expect(
      Number.parseInt(manifest.minimum_chrome_version, 10),
    ).toBeGreaterThanOrEqual(120)
  })

  test("locks Extension pages to packaged code and explicit blob resources", () => {
    // Given: the Extension-page CSP
    const manifest = manifestSchema.parse(
      JSON.parse(readText("packages/extension/public/manifest.json")),
    )
    const csp = manifest.content_security_policy.extension_pages
    const directives = parseCspDirectives(csp)

    // When: executable and runtime resource directives are inspected
    // Then: code/workers stay local while image, media, and frame blobs are explicit
    expect(directives["script-src"]).toEqual(["'self'"])
    expect(directives["worker-src"]).toEqual(["'self'"])
    expect(directives["object-src"]).toEqual(["'none'"])
    expect(csp).toMatch(/img-src[^;]*'self'[^;]*blob:/)
    expect(csp).not.toMatch(/img-src[^;]*https?:/)
    expect(csp).toMatch(/media-src[^;]*'self'[^;]*blob:/)
    expect(csp).toMatch(/frame-src[^;]*'self'[^;]*blob:/)
    expect(csp).not.toMatch(
      /script-src[^;]*(?:unsafe-inline|unsafe-eval|blob:|data:|https?:)/,
    )
    expect(csp).not.toMatch(/worker-src[^;]*(?:blob:|data:|https?:)/)
    expect(directives["require-trusted-types-for"]).toEqual(["'script'"])
    expect(directives["trusted-types"]).toEqual(["yindex-packaged-workers"])
    expect(directives["trusted-types"]).not.toContain("'allow-duplicates'")
    expect(manifest.sandbox).toBeUndefined()
    expect(manifest.content_security_policy.sandbox).toBeUndefined()
  })

  test("does not build or copy the retired sandbox wrapper", () => {
    // Given: package widgets mount directly in an isolated blob iframe
    const viteConfig = readText("packages/extension/vite.config.cts")

    // When: production inputs and static-copy targets are inspected
    // Then: no second iframe wrapper or sandbox bundle remains in the build
    expect(viteConfig).not.toContain("public/sandbox.html")
    expect(viteConfig).not.toContain("src/runtime/sandbox-frame.ts")
    expect(viteConfig).not.toContain('chunk.name === "sandbox"')
  })

  test("restricts the Worker policy to one packaged asset", () => {
    // Given: the production Worker policy and packaged Worker asset
    const policy = readText(
      "packages/extension/src/newtab/packagedWorkerPolicy.ts",
    )
    const worker = readText(
      "packages/extension/public/workers/packaged-worker.js",
    )

    // When: the allowlist and policy surface are inspected
    // Then: one private policy issues only the known packaged URL; browser E2E
    // separately proves runtime enforcement and execution.
    expect(policy).toContain(
      'const PACKAGED_WORKER_PATHS = ["/workers/packaged-worker.js"] as const',
    )
    expect(policy.match(/trustedTypes\.createPolicy\(/g)).toHaveLength(1)
    expect(policy).toContain(
      'trustedTypes.createPolicy(\n  "yindex-packaged-workers"',
    )
    expect(policy).toContain("trustedWorkerUrls.has(input)")
    expect(policy).not.toContain("allow-duplicates")
    expect(policy).not.toMatch(
      /export\s+(?:const|let|var)\s+packagedWorkerPolicy/,
    )
    expect(worker).toBe('self.postMessage("yindex-packaged-worker-ready")\n')
  })

  test("self-hosts both Noto SC variable families through Fontsource", () => {
    // Given: the new-tab entry, HTML, and package-local dependencies
    const entry = readText("packages/extension/src/newtab/main.tsx")
    const html = readText("packages/extension/newtab.html")
    const extensionPackage = packageSchema.parse(
      JSON.parse(readText("packages/extension/package.json")),
    )

    // When: font sources are inspected
    // Then: both families are local package imports and no Google font link remains
    expect(extensionPackage.dependencies).toHaveProperty(
      "@fontsource-variable/noto-sans-sc",
    )
    expect(extensionPackage.dependencies).toHaveProperty(
      "@fontsource-variable/noto-serif-sc",
    )
    expect(entry).toContain('import "@fontsource-variable/noto-sans-sc"')
    expect(entry).toContain('import "@fontsource-variable/noto-serif-sc"')
    expect(html).not.toContain("fonts.googleapis.com")
    expect(html).not.toContain("fonts.gstatic.com")
  })

  test("copies both OFL licenses into the installable output", () => {
    // Given: the Vite static-asset pipeline
    const viteConfig = readText("packages/extension/vite.config.cts")

    // When: Fontsource license targets are inspected
    // Then: each installed font keeps its OFL text in dist/licenses
    expect(viteConfig).toContain(
      "node_modules/@fontsource-variable/noto-sans-sc/LICENSE",
    )
    expect(viteConfig).toContain(
      "node_modules/@fontsource-variable/noto-serif-sc/LICENSE",
    )
    expect(viteConfig).toContain('rename: "Noto-Sans-SC-OFL.txt"')
    expect(viteConfig).toContain('rename: "Noto-Serif-SC-OFL.txt"')
    expect(viteConfig).toMatch(/assetsInlineLimit:\s*0/)
  })

  test("stages and documents one stable yindex-extension update folder", () => {
    // Given: packaging and user-install instructions
    const packScript = readText("scripts/pack-extension.sh")
    const readme = readText("README.md")
    const install = readText("INSTALL.md")

    // When: the staged root and update guidance are inspected
    // Then: releases expand to the exact folder users overwrite in place
    expect(packScript).toContain('STAGE="$OUT_DIR/yindex-extension"')
    expect(packScript).toContain('"yindex-extension"')
    expect(readme).toContain("`yindex-extension/`")
    expect(readme).toMatch(/覆盖[^\n]*同一[^\n]*`yindex-extension\/`/)
    expect(install).toContain("`yindex-extension/`")
    expect(install).toMatch(/覆盖[^\n]*同一[^\n]*`yindex-extension\/`/)
  })
})
