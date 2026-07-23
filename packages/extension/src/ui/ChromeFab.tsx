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
    <div
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        display: "flex",
        gap: 8,
        zIndex: 3100,
      }}
    >
      {props.editMode ? (
        <>
          <button
            type="button"
            onClick={props.onUndo}
            disabled={!props.canUndo}
            style={{ ...fab, opacity: props.canUndo ? 1 : 0.4 }}
            aria-label="撤销"
            title="撤销 (Ctrl/Cmd+Z)"
          >
            撤销
          </button>
          <button
            type="button"
            onClick={props.onRedo}
            disabled={!props.canRedo}
            style={{ ...fab, opacity: props.canRedo ? 1 : 0.4 }}
            aria-label="重做"
            title="重做"
          >
            重做
          </button>
        </>
      ) : null}
      <button
        type="button"
        onClick={props.onSettings}
        style={fab}
        aria-label="设置"
      >
        设置
      </button>
      <button
        type="button"
        onClick={props.onToggleEdit}
        style={{
          ...fab,
          background: props.editMode
            ? "oklch(0.55 0.12 250)"
            : "color-mix(in oklch, oklch(0.22 0.01 260) 88%, transparent)",
        }}
        aria-label={props.editMode ? "完成编辑" : "编辑"}
      >
        {props.editMode ? "完成" : "编辑"}
      </button>
    </div>
  )
}

const fab = {
  border: "1px solid color-mix(in oklch, white 14%, transparent)",
  background: "color-mix(in oklch, oklch(0.22 0.01 260) 88%, transparent)",
  color: "oklch(0.94 0.01 260)",
  borderRadius: 999,
  padding: "10px 16px",
  backdropFilter: "blur(12px)",
  fontSize: 13,
  cursor: "pointer",
} as const
