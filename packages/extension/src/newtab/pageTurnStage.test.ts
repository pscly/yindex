import { expect, test } from "bun:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { PageTurnStage, pageSlotFocusProps } from "./pageTurnStage"

test("Given a reduced Page Turn midpoint, When the stage renders, Then outgoing and incoming Pages both paint intermediate opacity", () => {
  const markup = renderToStaticMarkup(
    createElement(
      PageTurnStage,
      {
        fadeLayers: {
          outgoing: { index: 0, opacity: 0.5 },
          incoming: { index: 1, opacity: 0.5 },
        },
        isAnimating: true,
        offsetY: -20,
        parallaxY: 0,
        stripSlots: 5,
        activeSlot: 1,
      },
      createElement("section", { "data-page-id": "outgoing" }),
      createElement("section", { "data-page-id": "incoming" }),
      createElement("section", { "data-page-id": "other" }),
    ),
  )

  expect(markup).toContain('data-page-turn-role="outgoing"')
  expect(markup).toContain('data-page-turn-role="incoming"')
  expect(markup.match(/opacity:0\.5/g)?.length).toBe(2)
})

test("Given one Page, When the stage renders, Then its transform remains at the origin", () => {
  const markup = renderToStaticMarkup(
    createElement(
      PageTurnStage,
      {
        fadeLayers: null,
        isAnimating: false,
        offsetY: 0,
        parallaxY: 0,
        stripSlots: 1,
        activeSlot: 0,
      },
      createElement("section", { "data-page-id": "only" }),
    ),
  )

  expect(markup).toContain("translate3d(0, calc(0% + 0vh), 0)")
  expect(markup).not.toContain("-100%")
})

test("Given Loop strip clones, When the stage renders, Then only the current Page remains exposed to focus", () => {
  expect(pageSlotFocusProps(true)).toEqual({})
  expect(pageSlotFocusProps(false)).toEqual({
    "aria-hidden": true,
    inert: true,
    tabIndex: -1,
  })
  const markup = renderToStaticMarkup(
    createElement(
      PageTurnStage,
      {
        activeSlot: 1,
        fadeLayers: null,
        isAnimating: false,
        offsetY: 0,
        parallaxY: 0,
        stripSlots: 3,
      },
      createElement(
        "section",
        null,
        createElement("button", { type: "button" }, "前页"),
      ),
      createElement(
        "section",
        null,
        createElement("button", { type: "button" }, "当前页"),
      ),
      createElement(
        "section",
        null,
        createElement("button", { type: "button" }, "后页"),
      ),
    ),
  )

  expect(markup.match(/data-page-slot-active="true"/g)?.length).toBe(1)
  expect(markup.match(/data-page-slot-active="false"/g)?.length).toBe(2)
  expect(markup.match(/aria-hidden="true"/g)?.length).toBe(2)
  expect(markup.match(/inert=""/g)?.length).toBe(2)
})
