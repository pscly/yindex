import type { HomeDocument, Page } from "./types"

export function markPackageMissing(
  doc: HomeDocument,
  packageId: string,
): HomeDocument {
  const pages: Record<string, Page> = {}
  for (const [id, page] of Object.entries(doc.pages)) {
    pages[id] = {
      ...page,
      widgets: page.widgets.map((w) => {
        if (w.source.kind === "package" && w.source.packageId === packageId) {
          return {
            ...w,
            source: {
              kind: "missing" as const,
              packageId: w.source.packageId,
              typeId: w.source.typeId,
              lastPackageVersion: w.source.packageVersion,
              savedConfig: w.config,
            },
          }
        }
        return w
      }),
    }
  }
  return { ...doc, pages }
}

export function restorePackageInstances(
  doc: HomeDocument,
  packageId: string,
  packageVersion: string,
): HomeDocument {
  const pages: Record<string, Page> = {}
  for (const [id, page] of Object.entries(doc.pages)) {
    pages[id] = {
      ...page,
      widgets: page.widgets.map((w) => {
        if (w.source.kind === "missing" && w.source.packageId === packageId) {
          return {
            ...w,
            config: w.source.savedConfig,
            source: {
              kind: "package" as const,
              packageId: w.source.packageId,
              typeId: w.source.typeId,
              packageVersion,
            },
          }
        }
        return w
      }),
    }
  }
  return { ...doc, pages }
}

