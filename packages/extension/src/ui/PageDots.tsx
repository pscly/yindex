import type { HomeDocument } from "@yindex/domain"

export function PageDots(props: {
  readonly doc: HomeDocument
  readonly currentIndex: number
  readonly onSelect: (index: number) => void
}) {
  return (
    <nav
      aria-label="页面指示器"
      style={{
        position: "fixed",
        right: 14,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 3000,
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
              width: active ? 10 : 8,
              height: active ? 10 : 8,
              borderRadius: 999,
              border: "none",
              padding: 0,
              background: active
                ? "oklch(0.85 0.05 240)"
                : "color-mix(in oklch, white 35%, transparent)",
              boxShadow: active ? "0 0 0 3px color-mix(in oklch, white 18%, transparent)" : "none",
              cursor: "pointer",
            }}
          />
        )
      })}
    </nav>
  )
}
