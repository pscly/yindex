import type { HomeDocument } from "@yindex/domain"
import type { CSSProperties } from "react"

export function PageDots(props: {
  readonly doc: HomeDocument
  readonly currentIndex: number
  readonly onSelect: (index: number) => void
  readonly accent?: string | undefined
}) {
  const accent = props.accent ?? "oklch(0.78 0.05 240)"
  return (
    <nav
      aria-label="页面指示器"
      style={{
        position: "fixed",
        right: 16,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        zIndex: 3000,
        padding: "12px 8px",
        borderRadius: 999,
        background: "color-mix(in oklch, black 18%, transparent)",
        backdropFilter: "blur(8px)",
      }}
    >
      {props.doc.sequence.pageIds.map((id, index) => {
        const page = props.doc.pages[id]
        const active = index === props.currentIndex
        return (
          <button
            key={id}
            type="button"
            title={page?.name ?? id}
            aria-label={page?.name ?? `第 ${index + 1} 页`}
            aria-current={active ? "true" : undefined}
            onClick={() => props.onSelect(index)}
            style={{
              minWidth: 44,
              minHeight: 44,
              display: "grid",
              placeItems: "center",
              borderRadius: 999,
              border: "none",
              padding: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden
              data-page-dot-visual="true"
              style={{
                width: active ? 9 : 7,
                height: active ? 9 : 7,
                borderRadius: 999,
                border: active
                  ? "none"
                  : `1.5px solid color-mix(in oklch, ${accent} 55%, white)`,
                background: active ? accent : "transparent",
                boxShadow: active
                  ? `0 0 0 3px color-mix(in oklch, ${accent} 28%, transparent)`
                  : "none",
                transition: "transform 160ms ease, background 160ms ease",
                transform: active ? "scale(1.05)" : "scale(1)",
              }}
            />
          </button>
        )
      })}
    </nav>
  )
}
