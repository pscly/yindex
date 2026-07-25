import { expect, test } from "./extension.fixture"

test("reduced-motion Page Turn crossfades overlapping outgoing and incoming Pages without spring travel", async ({
  extensionContext,
  extensionId,
}) => {
  const page = await extensionContext.newPage()
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.locator("[data-page-id]").first()).toBeVisible()

  const frame = await page.evaluate(async () => {
    const stage = document.querySelector("#root > div > div")
    if (!(stage instanceof HTMLElement)) return null
    const transformBefore = getComputedStyle(stage).transform
    window.dispatchEvent(
      new WheelEvent("wheel", { cancelable: true, deltaY: 100 }),
    )

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const outgoing = document.querySelector(
        "[data-page-turn-role='outgoing']",
      )
      const incoming = document.querySelector(
        "[data-page-turn-role='incoming']",
      )
      if (!(outgoing instanceof HTMLElement)) continue
      if (!(incoming instanceof HTMLElement)) continue
      const outgoingOpacity = Number(getComputedStyle(outgoing).opacity)
      const incomingOpacity = Number(getComputedStyle(incoming).opacity)
      if (
        outgoingOpacity <= 0 ||
        outgoingOpacity >= 1 ||
        incomingOpacity <= 0 ||
        incomingOpacity >= 1
      ) {
        continue
      }
      return {
        incomingOpacity,
        incomingTop: incoming.getBoundingClientRect().top,
        incomingTransform: getComputedStyle(incoming).transform,
        outgoingOpacity,
        outgoingTop: outgoing.getBoundingClientRect().top,
        outgoingTransform: getComputedStyle(outgoing).transform,
        transformAfter: getComputedStyle(stage).transform,
        transformBefore,
      }
    }
    return null
  })

  expect(frame).not.toBeNull()
  if (!frame) return
  expect(frame.outgoingOpacity).toBeGreaterThan(0)
  expect(frame.outgoingOpacity).toBeLessThan(1)
  expect(frame.incomingOpacity).toBeGreaterThan(0)
  expect(frame.incomingOpacity).toBeLessThan(1)
  expect(frame.outgoingOpacity + frame.incomingOpacity).toBeCloseTo(1, 2)
  expect(frame.incomingTransform).not.toBe(frame.outgoingTransform)
  expect(Math.abs(frame.outgoingTop - frame.incomingTop)).toBeLessThan(1)
  expect(frame.transformAfter).toBe(frame.transformBefore)
})
