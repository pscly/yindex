# Home 配置仅落本机 chrome.storage（v1 无自建云）

yindex v1 将 Page 序列、Layout、Style、Widget 等结构化配置存在浏览器侧 `chrome.storage`（本机为主，不强制自建账号云）。大体积 Package 资源与 Wallpaper 媒体另存（见 ADR-0007）。跨设备与备份通过导出/导入（轻量 JSON 或完整 zip）补齐，而不是云账号。

## Considered Options

- **仅本机 chrome.storage 配置（采纳）** — 快、无账号；跨设备靠导出
- **本机 + 可选云同步** — 灵活，但要身份、冲突合并与后端
- **云端为主** — 跨设备强，但与「打开即用」冲突且 v1 过重
- **仅文件导入导出、无 storage** — 日常体验差

## Consequences

- 数据模型与持久化层按「单设备文档」设计；冲突合并可晚做
- 若日后上云，需明确导出 schema 版本与迁移，而不是假设存储形态不变
- 与 ADR-0007 分工：storage 管结构化配置，IDB/OPFS 管大资源
