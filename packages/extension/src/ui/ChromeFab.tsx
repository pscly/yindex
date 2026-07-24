import type { CSSProperties, ReactNode } from "react"

export function ChromeFab(props: {
  readonly editMode: boolean
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly onUndo: () => void
  readonly onRedo: () => void
  readonly onSettings: () => void
  readonly onToggleEdit: () => void
}) {
  return (
    <div style={dock} role="toolbar" aria-label="主控">
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
          background: props.editMode
            ? "oklch(0.62 0.14 36)"
            : "color-mix(in oklch, oklch(0.22 0.01 260) 92%, transparent)",
          boxShadow: props.editMode
            ? "0 6px 20px color-mix(in oklch, oklch(0.62 0.14 36) 35%, transparent)"
            : "0 8px 24px color-mix(in oklch, black 28%, transparent)",
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

const dock: CSSProperties = {
  position: "fixed",
  right: 20,
  bottom: 20,
  display: "flex",
  alignItems: "center",
  gap: 8,
  zIndex: 3100,
  padding: "8px 10px",
  borderRadius: 999,
  background: "color-mix(in oklch, oklch(0.16 0.008 260) 78%, transparent)",
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  backdropFilter: "blur(16px) saturate(1.2)",
  WebkitBackdropFilter: "blur(16px) saturate(1.2)",
  boxShadow: "0 12px 40px color-mix(in oklch, black 35%, transparent)",
}

const iconBtn: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "1px solid color-mix(in oklch, white 10%, transparent)",
  background: "color-mix(in oklch, white 6%, transparent)",
  color: "oklch(0.94 0.01 260)",
  display: "grid",
  placeItems: "center",
  padding: 0,
}

const primaryBtn: CSSProperties = {
  height: 36,
  minWidth: 64,
  borderRadius: 999,
  border: "1px solid color-mix(in oklch, white 12%, transparent)",
  color: "oklch(0.98 0.01 80)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.02em",
  padding: "0 16px",
  cursor: "pointer",
}

const divider: CSSProperties = {
  width: 1,
  height: 18,
  background: "color-mix(in oklch, white 14%, transparent)",
  margin: "0 2px",
}
