import type { HomeDocument } from "@yindex/domain"
import { resetAllLocalData, resetHomeOnly } from "../../storage/fullReset"
import type { MediaStore } from "../../wallpaper/mediaStore"
import { ghostBtn, h3, section } from "./styles"

export type ResetSectionActions = {
  readonly confirm: (message: string) => boolean
  readonly homeOnly: () => Promise<HomeDocument>
  readonly allLocalData: () => Promise<HomeDocument>
}

type ResetSectionProps = {
  readonly onReplaceDoc: (doc: HomeDocument) => void
  readonly setMsg: (message: string | null) => void
  readonly mediaStore?: MediaStore | undefined
  readonly actions?: ResetSectionActions
  readonly onResetComplete?: (() => Promise<void>) | undefined
}

export function ResetSection(props: ResetSectionProps) {
  const actions: ResetSectionActions = props.actions ?? {
    confirm: (message) => confirm(message),
    homeOnly: resetHomeOnly,
    allLocalData: () =>
      props.mediaStore
        ? resetAllLocalData({ mediaStore: props.mediaStore })
        : resetAllLocalData(),
  }

  async function runReset(
    confirmation: string,
    reset: () => Promise<HomeDocument>,
    successMessage: string,
  ): Promise<void> {
    if (!actions.confirm(confirmation)) return
    try {
      const doc = await reset()
      props.onReplaceDoc(doc)
      await props.onResetComplete?.()
      props.setMsg(successMessage)
    } catch (error) {
      props.setMsg(error instanceof Error ? error.message : "重置失败")
    }
  }

  return (
    <section style={section}>
      <h3 style={h3}>重置</h3>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <button
            type="button"
            style={ghostBtn}
            onClick={() =>
              runReset(
                "将恢复默认主页配置，壁纸与小组件包会保留。确定继续？",
                actions.homeOnly,
                "已重置主页配置，壁纸与小组件包保留",
              )
            }
          >
            仅重置主页配置
          </button>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.68 }}>
            恢复默认三页；壁纸与小组件包保留。
          </div>
        </div>
        <div>
          <button
            type="button"
            style={ghostBtn}
            onClick={() =>
              runReset(
                "此操作会永久清除主页配置、所有壁纸和所有小组件包，且无法撤销。确定继续？",
                actions.allLocalData,
                "已清除主页、壁纸与小组件包，并恢复默认主页",
              )
            }
          >
            清除全部本地数据
          </button>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.68 }}>
            永久清除主页、壁纸与小组件包，然后恢复默认主页。
          </div>
        </div>
      </div>
    </section>
  )
}
