import type { StyleTokens } from "@yindex/domain"
import { Component, type ReactNode } from "react"

type WidgetErrorBoundaryProps = {
  readonly children?: ReactNode
  readonly resetValue: unknown
  readonly tokens: StyleTokens
}

type WidgetErrorBoundaryState = {
  readonly failed: boolean
  readonly resetValue: unknown
}

export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  override state: WidgetErrorBoundaryState = {
    failed: false,
    resetValue: this.props.resetValue,
  }

  static getDerivedStateFromError(): Pick<WidgetErrorBoundaryState, "failed"> {
    return { failed: true }
  }

  static getDerivedStateFromProps(
    props: WidgetErrorBoundaryProps,
    state: WidgetErrorBoundaryState,
  ): WidgetErrorBoundaryState | null {
    if (props.resetValue === state.resetValue) return null
    return { failed: false, resetValue: props.resetValue }
  }

  override render() {
    if (!this.state.failed) return this.props.children
    return (
      <div
        role="alert"
        aria-label="小组件加载失败"
        data-widget-error-fallback="true"
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          display: "grid",
          placeItems: "center",
          padding: 12,
          color: this.props.tokens.color.ink,
          background: "transparent",
          fontFamily: this.props.tokens.typography.bodyFamily,
          fontSize: 13,
          textAlign: "center",
        }}
      >
        小组件暂时无法显示。
      </div>
    )
  }
}
