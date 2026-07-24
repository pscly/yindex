/** Shared presentation flags stored on widget instance config */

export function readShowTitle(config: unknown, defaultValue = true): boolean {
  if (typeof config === "object" && config !== null && "showTitle" in config) {
    return Boolean((config as { showTitle?: boolean }).showTitle)
  }
  return defaultValue
}

export function withShowTitle<T extends object>(
  config: T,
  showTitle: boolean,
): T & { showTitle: boolean } {
  return { ...config, showTitle }
}
