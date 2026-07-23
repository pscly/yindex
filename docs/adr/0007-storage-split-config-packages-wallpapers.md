# 配置、Package 与 Wallpaper 分存

yindex 将三类数据分开存放：Home/Page/Widget 的结构化配置使用 `chrome.storage`；导入的 Widget Package 静态资源使用 IndexedDB；Wallpaper 图片与视频使用 OPFS。原因是新标签页配置需要快速读写与同步键值语义，而包资源与媒体体积大、二进制多，不适合全部塞进 `chrome.storage` 默认配额。

## Considered Options

- **全部 chrome.storage.local** — 实现简单，大媒体易撞配额
- **IndexedDB 统一存大对象** — 可行，但壁纸流式读写与替换策略不如 OPFS 直观
- **配置 storage + Package IDB + Wallpaper OPFS（采纳）** — 分层清晰
- **File System Access 用户目录** — 空间大，授权与路径体验不适合默认新标签

## Consequences

- 导出/导入需要同时处理 JSON 配置与可选媒体/包资源清单
- 清除浏览器站点数据时，三类存储可能不一致，启动时要做引用完整性检查
- Package 升级与卸载必须同步清理或保留 IDB 中的包资源
