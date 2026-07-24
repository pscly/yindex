import {
  buildHomeDocument,
  createWidgetInstance,
  pageId,
  stylePackId,
  widgetInstanceId,
  widgetTypeId,
  withZ,
  type HomeDocument,
  type Page,
  type WidgetInstance,
} from "@yindex/domain"

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
  pack: string,
  widgets: readonly WidgetInstance[],
): Page {
  return {
    id: pageId(id),
    name,
    icon,
    style: { packId: stylePackId(pack), overrides: {} },
    widgets,
  }
}

/** Fixed default 3-page Home: knowledge / launch / atmosphere */
export function createDefaultHome(): HomeDocument {
  const knowledge = page("page_knowledge", "知识·典籍", "典", "inkstone", [
    w("builtin.quote", { x: 6, y: 10, w: 38, h: 24, z: 1 }, { source: "hitokoto" }),
    w("builtin.hexagram", { x: 48, y: 6, w: 46, h: 86, z: 2 }),
  ])

  const launch = page("page_launch", "启动·精密工具", "启", "caliper", [
    w("builtin.search", { x: 26, y: 26, w: 48, h: 10, z: 1 }, { engine: "google" }),
    w(
      "builtin.shortcuts",
      { x: 24, y: 42, w: 52, h: 36, z: 2 },
      {
        items: [
          { id: "s1", title: "GitHub", url: "https://github.com", favicon: fav("github.com") },
          { id: "s2", title: "文档", url: "https://developer.mozilla.org", favicon: fav("developer.mozilla.org") },
          { id: "s3", title: "邮箱", url: "https://mail.google.com", favicon: fav("mail.google.com") },
          { id: "s4", title: "云盘", url: "https://drive.google.com", favicon: fav("drive.google.com") },
          { id: "s5", title: "日历", url: "https://calendar.google.com", favicon: fav("calendar.google.com") },
          { id: "s6", title: "翻译", url: "https://translate.google.com", favicon: fav("translate.google.com") },
          { id: "s7", title: "笔记", url: "https://www.notion.so", favicon: fav("notion.so") },
          { id: "s8", title: "B站", url: "https://www.bilibili.com", favicon: fav("bilibili.com") },
        ],
      },
    ),
    w("builtin.weather", { x: 78, y: 8, w: 16, h: 16, z: 3 }, {
      mode: "auto",
      cityLabel: "本地",
    }),
  ])

  const atmosphere = page("page_atmosphere", "氛围·沉浸光雾", "雾", "dew-glass", [
    w("builtin.clock", { x: 20, y: 24, w: 60, h: 48, z: 1 }, { showSeconds: true }),
  ])

  const pages = [knowledge, launch, atmosphere].map((p) => ({
    ...p,
    widgets: p.widgets.map((widget, i) => ({
      ...widget,
      id: widgetInstanceId(`${p.id}_w${i}`),
    })),
  }))

  const docR = buildHomeDocument({
    pages,
    landingPageId: pageId("page_launch"),
    settings: {
      showWidgetTitles: false,
    },
  })
  if (!docR.ok) {
    throw new Error(`createDefaultHome failed: ${docR.error.message}`)
  }
  return docR.value
}
