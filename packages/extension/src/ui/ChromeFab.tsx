import type { ReactNode } from "react"
import {
  accentActionStyle,
  divider,
  fabDockStyle,
  fabIdlePrimaryStyle,
  iconBtn,
  primaryBtn,
} from "./chromeStyles"

export function ChromeFab(props: {
  readonly editMode: boolean
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly onUndo: () => void
  readonly onRedo: () => void
  readonly onSettings: () => void
  readonly onToggleEdit: () => void
  readonly pageAccent?: string | undefined
  readonly reducedMotion?: boolean | undefined
}) {
  const dock = fabDockStyle({
    pageAccent: props.pageAccent,
    reducedMotion: props.reducedMotion,
  })
  const active = accentActionStyle({ pageAccent: props.pageAccent })
  const idle = fabIdlePrimaryStyle()

  return (
    <div data-chrome-root style={dock} role="toolbar" aria-label="主控">
      {props.editMode ? (
        <>
          <IconBtn
            label="撤销"
            title="撤销 Ctrl/Cmd+Z"
            disabled={!props.canUndo}
            onClick={props.onUndo}
          >
            <UndoIcon />
          </IconBtn>
          <IconBtn
            label="重做"
            title="重做"
            disabled={!props.canRedo}
            onClick={props.onRedo}
          >
            <RedoIcon />
          </IconBtn>
          <div style={divider} aria-hidden />
        </>
      ) : null}
      <IconBtn label="设置" title="设置" onClick={props.onSettings}>
        <GearIcon />
      </IconBtn>
      <button
        type="button"
        onClick={props.onToggleEdit}
        aria-label={props.editMode ? "完成编辑" : "编辑"}
        title={props.editMode ? "完成编辑 Esc" : "编辑布局"}
        style={{
          ...primaryBtn,
          ...(props.editMode ? active : idle),
        }}
      >
        {props.editMode ? "完成" : "编辑"}
      </button>
    </div>
  )
}

function IconBtn(props: {
  readonly label: string
  readonly title: string
  readonly disabled?: boolean
  readonly onClick: () => void
  readonly children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.title}
      disabled={props.disabled}
      onClick={props.onClick}
      style={{
        ...iconBtn,
        opacity: props.disabled ? 0.35 : 1,
        cursor: props.disabled ? "not-allowed" : "pointer",
      }}
    >
      {props.children}
    </button>
  )
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <title>设置</title>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M19.4 13.5a7.6 7.6 0 0 0 .05-1.5l2.05-1.6-2-3.46-2.45.7a7.7 7.7 0 0 0-1.3-.75L15.4 3h-4l-.35 2.89c-.46.2-.9.45-1.3.75l-2.45-.7-2 3.46L7.4 12a7.6 7.6 0 0 0 0 1.5l-2.05 1.6 2 3.46 2.45-.7c.4.3.84.55 1.3.75L11.4 22h4l.35-2.89c.46-.2.9-.45 1.3-.75l2.45.7 2-3.46-2.05-1.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <title>撤销</title>
      <path
        d="M9 14 4 9l5-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 9h10a6 6 0 1 1 0 12h-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <title>重做</title>
      <path
        d="m15 14 5-5-5-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 9H10a6 6 0 1 0 0 12h3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}
