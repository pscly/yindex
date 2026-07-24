import { useMemo, useState, type CSSProperties } from "react"
import type { StyleTokens } from "@yindex/domain"
import { WidgetSurface } from "../shell/surface"
import {
  findByIndex,
  findByTrigrams,
  HEXAGRAMS,
  localDateKey,
  randomHexagram,
  trigramName,
  type Hexagram,
} from "./data"

export type HexagramBoardConfig = {
  readonly drawnIndex?: number
  readonly drawnDate?: string
  readonly notes?: Readonly<Record<string, string>>
  readonly dailyLog?: Readonly<Record<string, string>>
}

export type HexagramBoardProps = {
  readonly tokens: StyleTokens
  readonly config: HexagramBoardConfig
  readonly allowRedraw: boolean
  readonly showTitle?: boolean | undefined
  readonly onConfigChange?: (next: HexagramBoardConfig) => void
}

const TRIGRAM_COUNT = 8

export function HexagramBoard(props: HexagramBoardProps) {
  const [selected, setSelected] = useState<Hexagram | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const today = localDateKey()
  const drawnToday =
    props.config.drawnDate === today &&
    typeof props.config.drawnIndex === "number"
  const drawn = drawnToday
    ? findByIndex(props.config.drawnIndex as number)
    : undefined
  const locked = Boolean(drawn) && !props.allowRedraw

  const matrix = useMemo(() => {
    const rows: Array<Array<Hexagram | undefined>> = []
    for (let upper = 0; upper < TRIGRAM_COUNT; upper++) {
      const row: Array<Hexagram | undefined> = []
      for (let lower = 0; lower < TRIGRAM_COUNT; lower++) {
        row.push(findByTrigrams(upper, lower))
      }
      rows.push(row)
    }
    return rows
  }, [])

  function draw() {
    if (locked) return
    const h = randomHexagram()
    props.onConfigChange?.({
      ...props.config,
      drawnIndex: h.index,
      drawnDate: today,
    })
    setSelected(h)
  }

  const detail = selected ?? drawn ?? null

  return (
    <WidgetSurface tokens={props.tokens} title="六十四卦" showTitle={props.showTitle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={draw}
            disabled={locked}
            style={{
              ...btnStyle(props.tokens),
              opacity: locked ? 0.55 : 1,
              cursor: locked ? "not-allowed" : "pointer",
            }}
          >
            {locked ? "今日已抽" : drawn ? "再抽一卦" : "今日抽卦"}
          </button>
          <button
            type="button"
            onClick={() => setLibraryOpen((v) => !v)}
            style={btnStyle(props.tokens)}
          >
            {libraryOpen ? "收起卦库" : "打开卦库"}
          </button>
          {drawn ? (
            <span style={{ color: props.tokens.color.muted, fontSize: 12, alignSelf: "center" }}>
              今日：{drawn.index}. {drawn.name}
            </span>
          ) : null}
        </div>

        {detail ? (
          <div
            data-scrollable="true"
            onWheel={(e) => e.stopPropagation()}
            style={{
              padding: 10,
              borderRadius: props.tokens.radius.sm,
              background: `color-mix(in oklch, ${props.tokens.color.accent} 10%, transparent)`,
              overflow: "auto",
              maxHeight: libraryOpen ? 120 : "none",
              flex: libraryOpen ? "0 0 auto" : 1,
            }}
          >
            <div
              style={{
                fontFamily: props.tokens.typography.displayFamily,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              {detail.index}. {detail.name}（上{trigramName(detail.upper)}下
              {trigramName(detail.lower)}）
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55 }}>
              <div>
                <strong>卦辞</strong> {detail.judgment}
              </div>
              <div>
                <strong>象曰</strong> {detail.image}
              </div>
              <div style={{ color: props.tokens.color.muted, marginTop: 4 }}>
                {detail.note}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: props.tokens.color.muted, fontSize: 13 }}>
            点击矩阵查询，或抽取今日一卦。
          </div>
        )}

        {libraryOpen ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
              gap: 2,
            }}
            data-scrollable="true"
            onWheel={(e) => e.stopPropagation()}
          >
            {matrix.flatMap((row, ui) =>
              row.map((h, li) => (
                <button
                  key={`${ui}-${li}`}
                  type="button"
                  title={h ? `${h.index}.${h.name}` : ""}
                  onClick={() => h && setSelected(h)}
                  style={{
                    aspectRatio: "1",
                    border: `1px solid color-mix(in oklch, ${props.tokens.color.ink} 12%, transparent)`,
                    background:
                      detail?.index === h?.index
                        ? `color-mix(in oklch, ${props.tokens.color.accent} 28%, transparent)`
                        : "transparent",
                    color: props.tokens.color.ink,
                    fontSize: 10,
                    cursor: "pointer",
                    borderRadius: 4,
                    padding: 0,
                  }}
                >
                  {h?.name ?? "·"}
                </button>
              )),
            )}
          </div>
        ) : null}

        {!libraryOpen && !detail ? (
          <div style={{ color: props.tokens.color.muted, fontSize: 12 }}>
            共 {HEXAGRAMS.length} 卦 · 仅展示经典原文与简注，不做吉凶断言
          </div>
        ) : null}
      </div>
    </WidgetSurface>
  )
}

function btnStyle(tokens: StyleTokens): CSSProperties {
  return {
    border: `1px solid color-mix(in oklch, ${tokens.color.ink} 16%, transparent)`,
    background: "transparent",
    color: tokens.color.ink,
    borderRadius: tokens.radius.sm,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  }
}
