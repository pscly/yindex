import type { StyleTokens } from "@yindex/domain"
import { type CSSProperties, useMemo, useState } from "react"
import { LensSurface } from "../shell/surface"
import {
  HEXAGRAMS,
  type Hexagram,
  findByIndex,
  findByTrigrams,
  localDateKey,
  randomHexagram,
  trigramName,
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

  const actions = (
    <div
      style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: "0 0 auto" }}
    >
      <button
        type="button"
        onClick={draw}
        disabled={locked}
        style={{
          ...primaryBtnStyle(props.tokens),
          color: locked
            ? "var(--yindex-widget-muted-foreground)"
            : "var(--yindex-widget-foreground)",
          cursor: locked ? "not-allowed" : "pointer",
        }}
      >
        {locked ? "今日已抽" : drawn ? "再抽一卦" : "今日抽卦"}
      </button>
      <button
        type="button"
        onClick={() => setLibraryOpen((v) => !v)}
        style={ghostBtnStyle(props.tokens)}
      >
        {libraryOpen ? "收起卦库" : "打开卦库"}
      </button>
    </div>
  )

  return (
    <LensSurface
      tokens={props.tokens}
      shape="panel"
      title="六十四卦"
      showTitle={props.showTitle}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          height: "100%",
          minHeight: 0,
        }}
      >
        {libraryOpen ? (
          <>
            {actions}
            {detail ? (
              <div
                data-scrollable="true"
                style={{
                  padding: "10px 12px",
                  borderRadius: props.tokens.radius.sm,
                  background:
                    "color-mix(in oklch, var(--yindex-widget-foreground) 5%, transparent)",
                  overflow: "auto",
                  maxHeight: 120,
                  flex: "0 0 auto",
                  color: "var(--yindex-widget-foreground)",
                }}
              >
                <HexagramReading tokens={props.tokens} hexagram={detail} />
              </div>
            ) : null}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                display: "grid",
                gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
                gap: 3,
              }}
              data-scrollable="true"
            >
              {matrix.flatMap((row) =>
                row.map((h) => {
                  const active = detail?.index === h?.index
                  return (
                    <button
                      key={h?.index ?? "missing"}
                      type="button"
                      title={h ? `${h.index}.${h.name}` : ""}
                      onClick={() => h && setSelected(h)}
                      style={{
                        aspectRatio: "1",
                        border: `1px solid ${
                          active
                            ? props.tokens.color.accent
                            : "color-mix(in oklch, var(--yindex-widget-foreground) 14%, transparent)"
                        }`,
                        background: active
                          ? `color-mix(in oklch, ${props.tokens.color.accent} 22%, transparent)`
                          : "color-mix(in oklch, var(--yindex-widget-foreground) 6%, transparent)",
                        color: active
                          ? "var(--yindex-widget-foreground)"
                          : "var(--yindex-widget-muted-foreground)",
                        fontSize: 10,
                        cursor: "pointer",
                        borderRadius: 6,
                        padding: 0,
                      }}
                    >
                      {h?.name ?? "·"}
                    </button>
                  )
                }),
              )}
            </div>
          </>
        ) : (
          <>
            <div
              data-scrollable="true"
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                color: "var(--yindex-widget-foreground)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  fontWeight: 500,
                  color: "var(--yindex-widget-muted-foreground)",
                }}
              >
                今日一卦
              </div>
              {detail ? (
                <HexagramReading tokens={props.tokens} hexagram={detail} />
              ) : (
                <div
                  style={{
                    color: "var(--yindex-widget-muted-foreground)",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  今日尚未抽卦。抽一卦，读一段经典原文；或打开卦库查询六十四卦。
                </div>
              )}
            </div>
            {actions}
            <div
              style={{
                flex: "0 0 auto",
                color: "var(--yindex-widget-muted-foreground)",
                fontSize: 12,
              }}
            >
              共 {HEXAGRAMS.length} 卦 · 仅展示经典原文与简注，不做吉凶断言
            </div>
          </>
        )}
      </div>
    </LensSurface>
  )
}

function HexagramReading(props: {
  readonly tokens: StyleTokens
  readonly hexagram: Hexagram
}) {
  const { hexagram } = props
  return (
    <>
      <div
        style={{
          fontFamily: props.tokens.typography.displayFamily,
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1.3,
        }}
      >
        {hexagram.index}. {hexagram.name}
        <span
          style={{
            fontFamily: props.tokens.typography.bodyFamily,
            fontWeight: 400,
            fontSize: 12,
            color: "var(--yindex-widget-muted-foreground)",
            marginLeft: 8,
          }}
        >
          上{trigramName(hexagram.upper)}下{trigramName(hexagram.lower)}
        </span>
      </div>
      <div style={{ fontSize: 16.5, lineHeight: 1.55, maxWidth: "60ch" }}>
        <div>
          <strong>卦辞</strong> {hexagram.judgment}
        </div>
        <div>
          <strong>象曰</strong> {hexagram.image}
        </div>
        <div
          style={{
            color: "var(--yindex-widget-muted-foreground)",
            marginTop: 4,
          }}
        >
          {hexagram.note}
        </div>
      </div>
    </>
  )
}

function primaryBtnStyle(tokens: StyleTokens): CSSProperties {
  return {
    border: `1px solid color-mix(in oklch, ${tokens.color.accent} 55%, transparent)`,
    background: `color-mix(in oklch, ${tokens.color.accent} 26%, transparent)`,
    color: "var(--yindex-widget-foreground)",
    borderRadius: tokens.radius.sm,
    padding: "7px 14px",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 600,
    letterSpacing: "0.02em",
  }
}

function ghostBtnStyle(tokens: StyleTokens): CSSProperties {
  return {
    border:
      "1px solid color-mix(in oklch, var(--yindex-widget-foreground) 16%, transparent)",
    background: "transparent",
    color: "var(--yindex-widget-foreground)",
    borderRadius: tokens.radius.sm,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  }
}
