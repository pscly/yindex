import type { StyleTokens } from "@yindex/domain"
import { WidgetSurface } from "@yindex/widgets"

export function MissingWidget(props: {
  readonly tokens: StyleTokens
  readonly packageId: string
  readonly typeId: string
  readonly showTitle?: boolean
}) {
  return (
    <WidgetSurface
      tokens={props.tokens}
      title="缺失小组件"
      showTitle={props.showTitle !== false}
    >
      <div style={{ fontSize: 13, lineHeight: 1.5, color: props.tokens.color.muted }}>
        <div>Package 未安装或类型不可用。</div>
        <div style={{ marginTop: 8, fontFamily: props.tokens.typography.monoFamily, fontSize: 11 }}>
          {props.packageId} / {props.typeId}
        </div>
        <div style={{ marginTop: 8 }}>重装同一 Package 后可恢复配置与布局。</div>
      </div>
    </WidgetSurface>
  )
}
