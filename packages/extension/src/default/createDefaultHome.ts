import {
  type HomeDocument,
  type Page,
  type PageStyle,
  type WidgetInstance,
  buildHomeDocument,
  createWidgetInstance,
  pageId,
  widgetInstanceId,
  widgetTypeId,
  withZ,
} from "@yindex/domain"
import { FLOW, MOMENT, MUSE } from "@yindex/style-packs"

function fav(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

function w(
  type: string,
  layout: { x: number; y: number; w: number; h: number; z: number },
  config: unknown = {},
): WidgetInstance {
  return createWidgetInstance({
    source: { kind: "builtin", typeId: widgetTypeId(type) },
    layout: withZ(
      { x: layout.x, y: layout.y, w: layout.w, h: layout.h },
      layout.z,
    ),
    config,
  })
}

function page(
  id: string,
  name: string,
  icon: string,
  style: PageStyle,
  widgets: readonly WidgetInstance[],
): Page {
  return {
    id: pageId(id),
    name,
    icon,
    style,
    widgets,
  }
}

/**
 * Default Home v2 — three Living Glass scenes (DESIGN.md Layout):
 * 此刻 (landing) / 灵感 / 流光
 */
export function createDefaultHome(): HomeDocument {
  // 此刻: top weather, mid search, bottom shortcuts (+ clock as date companion)
  const moment = page("page_moment", "此刻", "时", MOMENT.pageStyle, [
    w(
      "builtin.weather",
      { x: 53, y: 6, w: 22, h: 12, z: 3 },
      {
        mode: "auto",
        cityLabel: "本地",
      },
    ),
    w(
      "builtin.clock",
      { x: 25, y: 6, w: 22, h: 8, z: 2 },
      {
        showSeconds: false,
        compact: true,
      },
    ),
    w(
      "builtin.search",
      { x: 22, y: 36, w: 56, h: 9, z: 1 },
      { engine: "google" },
    ),
    w(
      "builtin.shortcuts",
      { x: 18, y: 78, w: 64, h: 16, z: 2 },
      {
        items: [
          {
            id: "s1",
            title: "GitHub",
            url: "https://github.com",
            favicon: fav("github.com"),
          },
          {
            id: "s2",
            title: "文档",
            url: "https://developer.mozilla.org",
            favicon: fav("developer.mozilla.org"),
          },
          {
            id: "s3",
            title: "邮箱",
            url: "https://mail.google.com",
            favicon: fav("mail.google.com"),
          },
          {
            id: "s4",
            title: "云盘",
            url: "https://drive.google.com",
            favicon: fav("drive.google.com"),
          },
          {
            id: "s5",
            title: "日历",
            url: "https://calendar.google.com",
            favicon: fav("calendar.google.com"),
          },
          {
            id: "s6",
            title: "翻译",
            url: "https://translate.google.com",
            favicon: fav("translate.google.com"),
          },
          {
            id: "s7",
            title: "笔记",
            url: "https://www.notion.so",
            favicon: fav("notion.so"),
          },
          {
            id: "s8",
            title: "B站",
            url: "https://www.bilibili.com",
            favicon: fav("bilibili.com"),
          },
        ],
      },
    ),
  ])

  // 灵感: quote + hexagram
  const muse = page("page_muse", "灵感", "灵", MUSE.pageStyle, [
    w(
      "builtin.quote",
      { x: 14, y: 14, w: 54, h: 30, z: 1 },
      { source: "hitokoto" },
    ),
    w("builtin.hexagram", { x: 60, y: 54, w: 34, h: 39, z: 2 }),
  ])

  // 流光: oversized clock only
  const flow = page("page_flow", "流光", "光", FLOW.pageStyle, [
    w(
      "builtin.clock",
      { x: 10, y: 18, w: 80, h: 48, z: 1 },
      { showSeconds: true },
    ),
  ])

  const pages = [moment, muse, flow].map((p) => ({
    ...p,
    widgets: p.widgets.map((widget, i) => ({
      ...widget,
      id: widgetInstanceId(`${p.id}_w${i}`),
    })),
  }))

  const docR = buildHomeDocument({
    pages,
    landingPageId: pageId("page_moment"),
    settings: {
      showWidgetTitles: false,
      motionProfile: "balanced",
    },
  })
  if (!docR.ok) {
    throw new Error(`createDefaultHome failed: ${docR.error.message}`)
  }
  return docR.value
}
