import { z } from "zod"

export const YINDEX_API_VERSION = 1 as const

export const packagePermissionSchema = z.enum([
  "storage.instance",
  "notifications",
  "alarms",
  "clipboard.write",
  "network.fetch",
])

export type PackagePermission = z.infer<typeof packagePermissionSchema>

export const widgetTypeManifestSchema = z.object({
  typeId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  defaultSize: z
    .object({
      w: z.number().positive(),
      h: z.number().positive(),
    })
    .optional(),
  entry: z.string().min(1),
  configSchema: z.record(z.unknown()).optional(),
})

export const packageManifestSchema = z.object({
  packageId: z.string().min(1),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  engines: z.object({
    yindex: z.string().min(1),
  }),
  yindexApiVersion: z.number().int().positive(),
  types: z.array(widgetTypeManifestSchema).min(1),
  permissions: z.array(packagePermissionSchema).default([]),
  hostPermissions: z.array(z.string()).default([]),
  description: z.string().optional(),
  icons: z.record(z.string()).optional(),
})

export type PackageManifest = z.infer<typeof packageManifestSchema>
export type WidgetTypeManifest = z.infer<typeof widgetTypeManifestSchema>

export type ManifestError = {
  readonly code: "parse" | "api" | "engine"
  readonly message: string
}

export function parsePackageManifest(
  raw: unknown,
):
  | { readonly ok: true; readonly value: PackageManifest }
  | { readonly ok: false; readonly error: ManifestError } {
  const parsed = packageManifestSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "parse",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      },
    }
  }
  if (parsed.data.yindexApiVersion !== YINDEX_API_VERSION) {
    return {
      ok: false,
      error: {
        code: "api",
        message: `yindexApiVersion ${parsed.data.yindexApiVersion} incompatible with host ${YINDEX_API_VERSION}`,
      },
    }
  }
  if (!satisfiesEngine(parsed.data.engines.yindex, YINDEX_API_VERSION)) {
    return {
      ok: false,
      error: {
        code: "engine",
        message: `engines.yindex ${parsed.data.engines.yindex} not satisfied by host ${YINDEX_API_VERSION}`,
      },
    }
  }
  return { ok: true, value: parsed.data }
}

/** Minimal semver range: supports `>=N <M` and `^N` and exact number match for yindex major. */
export function satisfiesEngine(range: string, hostMajor: number): boolean {
  const trimmed = range.trim()
  const geLt = trimmed.match(/^>=\s*(\d+)(?:\.\d+\.\d+)?\s+<\s*(\d+)(?:\.\d+\.\d+)?$/)
  if (geLt) {
    const min = Number(geLt[1])
    const max = Number(geLt[2])
    return hostMajor >= min && hostMajor < max
  }
  const caret = trimmed.match(/^\^\s*(\d+)/)
  if (caret) {
    const major = Number(caret[1])
    return hostMajor === major
  }
  const exact = trimmed.match(/^(\d+)(?:\.\d+\.\d+)?$/)
  if (exact) {
    return hostMajor === Number(exact[1])
  }
  // permissive fallback for `>=1`
  const ge = trimmed.match(/^>=\s*(\d+)/)
  if (ge) {
    return hostMajor >= Number(ge[1])
  }
  return false
}
