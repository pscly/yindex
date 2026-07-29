import { expect, test } from "bun:test"
import {
  Fragment,
  act,
  createElement,
  useEffect,
  useRef,
  useState,
} from "react"
import { pageTokensOf } from "./PageCanvas"
import { WidgetMount } from "./WidgetMount"
import {
  installVideoStillTestDom,
  mountVideoSurface,
} from "./test/videoStillDomHarness"
import {
  malformedShortcutsFixture,
  noWidgetConfig,
} from "./test/widgetMountConfigHarness"

function InteractiveSibling() {
  const [clicks, setClicks] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const button = buttonRef.current
    if (button === null) return
    const increment = () => setClicks((value) => value + 1)
    button.addEventListener("click", increment)
    return () => button.removeEventListener("click", increment)
  }, [])
  return createElement(
    "button",
    { ref: buttonRef, type: "button", "data-sibling-clicks": String(clicks) },
    "Sibling action",
  )
}

test("Given one Widget throws during render, When sibling Home content mounts, Then an accessible local fallback contains the failure and the sibling stays interactive", async () => {
  // Given
  const fixture = malformedShortcutsFixture()
  const tokens = pageTokensOf(fixture.page, null)
  const throwingItems = [
    { id: "throwing", title: "Throwing", url: "https://example.com" },
  ]
  Object.defineProperty(throwingItems, "map", {
    value: () => {
      throw new Error("synthetic Widget render failure")
    },
  })
  const testDocument = installVideoStillTestDom()
  const mounted = mountVideoSurface(testDocument)
  const errors: unknown[][] = []
  const originalError = console.error
  console.error = (...values: unknown[]) => errors.push(values)

  // When
  try {
    await mounted.render(
      createElement(
        Fragment,
        null,
        createElement(WidgetMount, {
          doc: fixture.doc,
          pageId: fixture.page.id,
          widget: { ...fixture.widget, config: { items: throwingItems } },
          pageTokens: tokens,
          editMode: false,
          reducedMotion: false,
          onWidgetConfig: noWidgetConfig,
        }),
        createElement(InteractiveSibling),
      ),
    )
    const button = mounted.host.querySelector("button")
    if (button === null) throw new Error("interactive sibling did not mount")
    await act(async () => {
      button.dispatchEvent(new Event("click"))
    })
  } finally {
    console.error = originalError
  }

  // Then
  const fallback = mounted.host.querySelector(
    '[data-widget-error-fallback="true"]',
  )
  expect(fallback?.getAttribute("role")).toBe("alert")
  expect(
    mounted.host.querySelector("button")?.getAttribute("data-sibling-clicks"),
  ).toBe("1")
  expect(errors.length).toBeGreaterThan(0)
  await mounted.unmount()
})
