import { expect, test } from "bun:test"
import type { HomeDocument } from "@yindex/domain"
import { Children, type ReactNode, isValidElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createDefaultHome } from "../../default/createDefaultHome"
import { ResetSection, type ResetSectionActions } from "./ResetSection"

type ButtonProps = {
  readonly children?: ReactNode
  readonly onClick?: () => Promise<void>
}

function findButton(node: ReactNode, label: string): ReactNode {
  if (
    isValidElement<ButtonProps>(node) &&
    node.type === "button" &&
    Children.toArray(node.props.children).join("") === label
  ) {
    return node
  }
  if (!isValidElement<{ readonly children?: ReactNode }>(node)) return null
  for (const child of Children.toArray(node.props.children)) {
    const found = findButton(child, label)
    if (found !== null) return found
  }
  return null
}

function buttonHandler(section: ReactNode, label: string): () => Promise<void> {
  const button = findButton(section, label)
  if (!isValidElement<ButtonProps>(button) || !button.props.onClick) {
    throw new Error(`expected ${label} button`)
  }
  return button.props.onClick
}

test("Given reset Settings, When rendered, Then Home-only and destructive local-data actions are named truthfully", () => {
  const markup = renderToStaticMarkup(
    <ResetSection onReplaceDoc={() => undefined} setMsg={() => undefined} />,
  )

  expect(markup).toContain("仅重置主页配置")
  expect(markup).toContain("壁纸与小组件包保留")
  expect(markup).toContain("清除全部本地数据")
  expect(markup).toContain("主页、壁纸与小组件包")
})

test("Given both reset actions are confirmed, When each button runs, Then its returned default Home replaces the current document", async () => {
  // Given
  const replacements: HomeDocument[] = []
  const messages: Array<string | null> = []
  const confirmations: string[] = []
  let homeOnlyCalls = 0
  let fullResetCalls = 0
  const actions: ResetSectionActions = {
    confirm(message) {
      confirmations.push(message)
      return true
    },
    async homeOnly() {
      homeOnlyCalls += 1
      return createDefaultHome()
    },
    async allLocalData() {
      fullResetCalls += 1
      return createDefaultHome()
    },
  }
  const section = ResetSection({
    onReplaceDoc: (doc) => replacements.push(doc),
    setMsg: (message) => messages.push(message),
    actions,
  })

  // When
  await buttonHandler(section, "仅重置主页配置")()
  await buttonHandler(section, "清除全部本地数据")()

  // Then
  expect(homeOnlyCalls).toBe(1)
  expect(fullResetCalls).toBe(1)
  expect(confirmations).toHaveLength(2)
  expect(confirmations[0]).toContain("壁纸与小组件包会保留")
  expect(confirmations[1]).toContain("主页配置、所有壁纸和所有小组件包")
  expect(replacements).toEqual([createDefaultHome(), createDefaultHome()])
  expect(messages).toEqual([
    "已重置主页配置，壁纸与小组件包保留",
    "已清除主页、壁纸与小组件包，并恢复默认主页",
  ])
})
