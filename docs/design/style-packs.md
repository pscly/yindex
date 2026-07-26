# v0.2 Style Pack 细则

> **当前指南。** 本文服从 [`DESIGN.md`](../../DESIGN.md) v0.2 与 ADR 0009。yindex 的所有 Page 共用一套 Liquid Glass 材质系统。Style Pack 只改变 Wallpaper 光场、seed palette、字体气质与默认构图，不另造材质系统。

## 统一 Liquid Glass 契约

MOMENT、MUSE、FLOW 共用以下规则：

- Adaptive Glass 分析 Wallpaper 的亮度、色彩与细节密度，再选择可读的透镜底色与前景色
- 搜索、快捷方式、天气、Hexagram Board 等工具型 Widget 使用玻璃透镜
- 时钟、每日一句等内容型信息可无壳直排，但仍使用同一套前景与 scrim 可读性保护
- Glass Profile 提供「清透、均衡、沉静」三种基础气质
- 透光、模糊、饱和与高光的高级微调叠加在所选档位上
- 最低可读性保护始终生效，不能被档位或高级微调关闭
- 默认 Wallpaper 是本机实时渲染的生成式光场；导入的本地图片与视频存入 OPFS
- reduced-motion 会停止环境动效，并把动态或视频 Wallpaper 固定为静态帧

三个首发 Pack 默认都使用「均衡」Glass Profile。用户更换档位时，不会改变 Pack 身份或 Page 构图。

## Pack 一览

| Pack | Page | 光场 | 字体气质 | Accent | 默认职责 |
|---|---|---|---|---|---|
| `MOMENT` | 此刻 | 晨光场 | Sans | 晨蓝 | Landing 与日常启动 |
| `MUSE` | 灵感 | 暖墨场 | Serif | 朱砂 | 阅读与沉思 |
| `FLOW` | 流光 | 深海夜光场 | Sans | 冷青 | 时间与沉浸 |

## `MOMENT` · 此刻

此刻是默认 Landing Page。冷亮的生成式 Wallpaper 像清晨透进窗内的天光，适合快速开始一天。

| 字段 | 默认值 |
|---|---|
| Style Pack id | `moment` |
| Generative preset | `moment` |
| Typography mood | `sans` |
| Glass Profile | `均衡` |
| Wallpaper dim | `0.12` |
| Background seed | `oklch(0.72 0.04 240)` |
| Surface seed | `oklch(0.92 0.02 240 / 0.45)` |
| Ink seed | `oklch(0.22 0.03 250)` |
| Muted seed | `oklch(0.42 0.02 250)` |
| Accent | `oklch(0.62 0.10 240)` |

默认构图：

1. 日期与天气组成紧凑的顶部信息带
2. 搜索透镜位于视觉中心附近，是主要操作入口
3. 快捷方式使用靠近底部的横向玻璃架
4. 透镜数量保持克制，让晨光 Wallpaper 留出足够呼吸空间

## `MUSE` · 灵感

灵感使用深暖色生成式 Wallpaper 与克制的朱砂强调色。Serif 展示字体给阅读内容独立气质，材质仍与其他 Page 共用 Liquid Glass。

| 字段 | 默认值 |
|---|---|
| Style Pack id | `muse` |
| Generative preset | `muse` |
| Typography mood | `serif` |
| Glass Profile | `均衡` |
| Wallpaper dim | `0.20` |
| Background seed | `oklch(0.18 0.02 40)` |
| Surface seed | `oklch(0.28 0.03 40 / 0.5)` |
| Ink seed | `oklch(0.93 0.02 70)` |
| Muted seed | `oklch(0.72 0.03 60)` |
| Accent | `oklch(0.55 0.18 28)` |

默认构图：

1. 每日一句以内容直排形式放在上部光场
2. Hexagram Board 使用玻璃面板，位于中下部或右侧
3. 暖墨光场需要透过材质显现，不能退化成不透明深色底板

## `FLOW` · 流光

流光把大部分视口交给深海夜光场，构图有意保持稀疏。

| 字段 | 默认值 |
|---|---|
| Style Pack id | `flow` |
| Generative preset | `flow` |
| Typography mood | `sans` |
| Glass Profile | `均衡` |
| Wallpaper dim | `0.18` |
| Background seed | `oklch(0.12 0.03 260)` |
| Surface seed | `oklch(0.24 0.04 250 / 0.45)` |
| Ink seed | `oklch(0.96 0.01 240)` |
| Muted seed | `oklch(0.78 0.03 230)` |
| Accent | `oklch(0.78 0.08 200)` |

默认构图：

1. 一个超大内容直排时钟位于几何中心上方
2. 小号日期行作为辅助信息
3. 除非工具需要交互表面，否则不额外增加玻璃透镜

## Glass Profile

| 档位 | Blur 范围 | Tint 不透明度范围 | 适用场景 |
|---|---|---|---|
| 清透 | `14px` 至 `18px` | `8%` 至 `14%` | 安静、低细节 Wallpaper |
| 均衡 | `22px` 至 `28px` | `16%` 至 `24%` | 适配各类 Wallpaper 的默认档位 |
| 沉静 | `30px` 至 `40px` | `28%` 至 `40%` | 细节丰富的图片与视频 |

Adaptive Glass 会把最终 blur 与 tint 保持在所选档位范围内，同时按 Wallpaper 情况调整明暗极性、前景色与 scrim，守住对比度。

## Wallpaper 选择

每个 Pack 默认使用同名生成式 preset。用户可以换成本地图片或视频。导入后，媒体会复制到 OPFS 并由 Page Style 引用，原始文件不需要留在导入路径。

只有当前 Page 运行动态 Wallpaper。离开 Page 后，视频暂停，生成式 Wallpaper 停止渲染。系统启用 reduced-motion 时，动态和视频 Wallpaper 显示静态帧。

## 跨 Pack 不变量

1. Liquid Glass 是全产品唯一的材质系统。
2. Adaptive Glass 必须保护正文和次要文字的可读性。
3. Style Pack 改变场景输入，不改变 Widget 行为或编辑器语义。
4. 编辑器保持稳定的石墨壳，只借当前 Page 的少量环境色。
5. 应用新 Pack 会替换 Page Style 默认值，不会把 Widget 配置与 Layout 合并进 Pack。
6. 空白 Page 可以复制当前 Page Style，但不是第四个 Style Pack。
