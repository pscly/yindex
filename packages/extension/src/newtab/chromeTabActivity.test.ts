import { expect, test } from "bun:test"
import {
  type ChromeTabActivityPort,
  subscribeChromeTabActivity,
} from "./chromeTabActivity"

test("publishes inactive when another Chrome tab activates", async () => {
  let listener: ((info: { readonly tabId: number }) => void) | undefined
  const activity: boolean[] = []
  const tabs: ChromeTabActivityPort = {
    getCurrent: async () => ({ id: 7 }),
    onActivated: {
      addListener: (next) => {
        listener = next
      },
      removeListener: () => {
        listener = undefined
      },
    },
  }

  const unsubscribe = await subscribeChromeTabActivity(tabs, (active) =>
    activity.push(active),
  )
  listener?.({ tabId: 8 })
  listener?.({ tabId: 7 })
  unsubscribe()

  expect(activity).toEqual([true, false, true])
  expect(listener).toBeUndefined()
})
