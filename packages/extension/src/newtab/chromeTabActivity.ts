export type ChromeTabActivityPort = {
  readonly getCurrent: () => Promise<
    { readonly id?: number | undefined } | undefined
  >
  readonly onActivated: {
    addListener(listener: (info: { readonly tabId: number }) => void): void
    removeListener(listener: (info: { readonly tabId: number }) => void): void
  }
}

export async function subscribeChromeTabActivity(
  tabs: ChromeTabActivityPort,
  publish: (active: boolean) => void,
): Promise<() => void> {
  const current = await tabs.getCurrent()
  const currentTabId = current?.id
  if (currentTabId === undefined) return () => {}
  const onActivated = ({ tabId }: { readonly tabId: number }): void => {
    publish(tabId === currentTabId)
  }
  tabs.onActivated.addListener(onActivated)
  publish(true)
  return () => tabs.onActivated.removeListener(onActivated)
}
