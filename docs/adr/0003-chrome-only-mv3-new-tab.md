# v1 仅面向 Chrome（MV3 新标签页扩展）

yindex v1 只作为 Chrome Extension（Manifest V3）运行，并以开发者模式加载 unpacked，通过覆盖浏览器新标签页承载 Home。原因：产品核心依赖 Chrome 扩展能力与新标签接管路径；先单浏览器可把 Page Turn、Widget 包导入与本地存储做扎实，再考虑 Chromium 系或其它浏览器。

## Considered Options

- **仅 Chrome（采纳）** — 范围清晰
- **Chromium 系兼容** — 边际成本中等，可后置验证
- **Chrome + Firefox** — API 与审核双线，v1 过重
- **纯 Web 无扩展** — 无法真正成为「新标签页主页」

## Consequences

- 技术选型与权限以 `chrome.*` / MV3 为准
- v1 不承诺 Chrome Web Store 上架；第三方运行模型见 ADR-0002
