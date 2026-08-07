import { assertNever } from "@yindex/domain"
import { ShortcutsEditor, shortcutCellsOf } from "./ShortcutsEditor"
import { inputStyle, labelStyle, rowCheck } from "./editChromeStyles"

type ConfigField =
  | "showSeconds"
  | "engine"
  | "customUrl"
  | "mode"
  | "cityLabel"
  | "latitude"
  | "longitude"
  | "source"

function fieldOf(config: unknown, key: ConfigField): unknown {
  if (typeof config !== "object" || config === null) return undefined
  switch (key) {
    case "showSeconds":
      return "showSeconds" in config ? config.showSeconds : undefined
    case "engine":
      return "engine" in config ? config.engine : undefined
    case "customUrl":
      return "customUrl" in config ? config.customUrl : undefined
    case "mode":
      return "mode" in config ? config.mode : undefined
    case "cityLabel":
      return "cityLabel" in config ? config.cityLabel : undefined
    case "latitude":
      return "latitude" in config ? config.latitude : undefined
    case "longitude":
      return "longitude" in config ? config.longitude : undefined
    case "source":
      return "source" in config ? config.source : undefined
    default:
      return assertNever(key)
  }
}

function stringField(config: unknown, key: ConfigField): string | undefined {
  const value = fieldOf(config, key)
  return typeof value === "string" ? value : undefined
}

function numberField(config: unknown, key: ConfigField): number | undefined {
  const value = fieldOf(config, key)
  return typeof value === "number" ? value : undefined
}

export function SelectedWidgetEditor(props: {
  readonly sourceKind: string
  readonly typeId: string
  readonly config: unknown
  readonly onConfig: (config: unknown) => void
}) {
  if (props.sourceKind !== "builtin") {
    return (
      <div style={{ fontSize: 12, opacity: 0.65 }}>
        Package 小组件配置由其内部界面处理。
      </div>
    )
  }

  if (props.typeId === "builtin.clock") {
    const rawShowSeconds = fieldOf(props.config, "showSeconds")
    const showSeconds =
      typeof rawShowSeconds === "boolean" ? rawShowSeconds : true
    return (
      <label style={rowCheck}>
        <input
          type="checkbox"
          checked={showSeconds}
          onChange={(event) =>
            props.onConfig({ showSeconds: event.target.checked })
          }
        />
        显示秒
      </label>
    )
  }

  if (props.typeId === "builtin.search") {
    const engine = stringField(props.config, "engine") ?? "google"
    const customUrl = stringField(props.config, "customUrl")
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={labelStyle}>
          搜索引擎
          <select
            value={engine}
            onChange={(event) =>
              props.onConfig({
                engine: event.target.value,
                customUrl,
              })
            }
            style={inputStyle}
          >
            <option value="google">Google</option>
            <option value="bing">Bing</option>
            <option value="duckduckgo">DuckDuckGo</option>
            <option value="baidu">百度</option>
            <option value="custom">自定义</option>
          </select>
        </label>
        {engine === "custom" ? (
          <label style={labelStyle}>
            自定义 URL（%s 为查询词）
            <input
              value={customUrl ?? ""}
              placeholder="https://example.com/?q=%s"
              onChange={(event) =>
                props.onConfig({
                  engine: "custom",
                  customUrl: event.target.value,
                })
              }
              style={inputStyle}
            />
          </label>
        ) : null}
      </div>
    )
  }

  if (props.typeId === "builtin.weather") {
    const mode = stringField(props.config, "mode") ?? "auto"
    const cityLabel = stringField(props.config, "cityLabel") ?? ""
    const latitude = numberField(props.config, "latitude") ?? 31.23
    const longitude = numberField(props.config, "longitude") ?? 121.47
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={labelStyle}>
          定位
          <select
            value={mode}
            onChange={(event) =>
              props.onConfig({
                mode: event.target.value,
                cityLabel,
                latitude,
                longitude,
              })
            }
            style={inputStyle}
          >
            <option value="auto">自动（定位 / 默认上海）</option>
            <option value="manual">手动经纬度</option>
          </select>
        </label>
        <label style={labelStyle}>
          城市标签
          <input
            value={cityLabel}
            onChange={(event) =>
              props.onConfig({
                mode,
                cityLabel: event.target.value,
                latitude,
                longitude,
              })
            }
            style={inputStyle}
            placeholder="本地"
          />
        </label>
        {mode === "manual" ? (
          <>
            <label style={labelStyle}>
              纬度
              <input
                type="number"
                step="0.01"
                value={latitude}
                onChange={(event) =>
                  props.onConfig({
                    mode: "manual",
                    cityLabel,
                    latitude: Number(event.target.value),
                    longitude,
                  })
                }
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              经度
              <input
                type="number"
                step="0.01"
                value={longitude}
                onChange={(event) =>
                  props.onConfig({
                    mode: "manual",
                    cityLabel,
                    latitude,
                    longitude: Number(event.target.value),
                  })
                }
                style={inputStyle}
              />
            </label>
          </>
        ) : null}
      </div>
    )
  }

  if (props.typeId === "builtin.quote") {
    const source = stringField(props.config, "source") ?? "hitokoto"
    return (
      <label style={labelStyle}>
        来源
        <select
          value={source}
          onChange={(event) =>
            props.onConfig({
              ...(typeof props.config === "object" && props.config !== null
                ? props.config
                : {}),
              source: event.target.value,
            })
          }
          style={inputStyle}
        >
          <option value="hitokoto">Hitokoto 网络</option>
          <option value="static">静态回退句</option>
        </select>
      </label>
    )
  }

  if (props.typeId === "builtin.shortcuts") {
    return (
      <ShortcutsEditor
        cells={shortcutCellsOf(props.config)}
        onChange={(cells) => props.onConfig({ items: cells })}
      />
    )
  }

  return (
    <div style={{ fontSize: 12, opacity: 0.65 }}>此类型暂无额外配置项。</div>
  )
}
