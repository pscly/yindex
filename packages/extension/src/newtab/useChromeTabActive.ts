import { useEffect, useState } from "react"
import { subscribeChromeTabActivity } from "./chromeTabActivity"

export function useChromeTabActive(): boolean {
  const [active, setActive] = useState(true)

  useEffect(() => {
    let mounted = true
    let unsubscribe = (): void => {}
    void subscribeChromeTabActivity(
      {
        getCurrent: () => chrome.tabs.getCurrent(),
        onActivated: chrome.tabs.onActivated,
      },
      (nextActive) => {
        if (mounted) setActive(nextActive)
      },
    ).then((cleanup) => {
      if (mounted) unsubscribe = cleanup
      else cleanup()
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return active
}
