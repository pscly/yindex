# 第三方 Widget 通过本地包导入，在 sandbox 中运行并使用宽能力桥

yindex v1 以 Chrome 开发者模式加载 unpacked Extension，并支持用户导入本地 Widget Package（zip/目录）。Chrome MV3 不允许运行中的特权 Extension 页面把用户刚选择的任意 JavaScript 直接当作扩展包内代码执行；因此包代码在 manifest sandbox 页面中运行，通过显式消息协议调用宿主提供的宽能力桥。产品仍采用「导入即高度信任」模型，但不再声称第三方代码与宿主处于同一执行域。

## Considered Options

- **独立扩展 + 消息协议** — 隔离最好，安装与开发摩擦大
- **本地包 + sandbox + 宽能力桥（采纳）** — 保留界面内即时导入；能力需经宿主协议显式暴露
- **导入后写入扩展源码并 reload** — 可成为扩展包内同权代码，但安装不即时且依赖外部工具/手动重载
- **unpacked + localhost 代码源** — 适合开发，依赖常驻本地服务
- **iframe 受信 URL** — 依赖网络与会话，模型不同

## Consequences

- 安装 UX 必须说明「导入即信任该代码调用 yindex 暴露的能力」；sandbox 是执行边界，不等于 Package 无能力
- v1 明确不以 Chrome Web Store 为分发目标，而是开发者模式加载 unpacked；若未来上架，需收紧或改为桥接模型
- 包协议使用稳定 `packageId` 与 semver；重复导入同 id 的新版本视为升级，并需迁移既有实例配置
- 包升级必须原子化：切换前验证新版本与配置 migration；失败自动恢复上一版本及其配置快照
- 卸载包时保留依赖它的 Widget Instance、配置和 Layout 占位；重装同 `packageId` 后自动恢复
- 宽能力桥必须版本化、验证消息与数据边界，并保证单个实例异常不破坏 Home
- 能力桥以尽可能覆盖 Extension 可声明并获授的 Chrome API 为目标，而不是仅提供少数业务 API；浏览器未授权或技术上不可桥接的能力不在承诺内
- 每个 Package 在 manifest 中声明所需 Chrome 权限与 host 范围；导入时逐项展示并请求授权，未声明或未获授权的能力由桥拒绝
- Widget SDK 根据 Chrome API schema 生成类型化能力适配器；宿主逐次校验调用与事件订阅，不提供任意字符串 `rawCall` 逃生口
- 宿主 API 主版本从 1 起；Package 用 `engines.yindex` 声明兼容范围，主版本不兼容则拒绝导入
- 每个 Widget Instance 运行在独立 sandbox iframe 中；DOM 与运行状态按实例隔离，实例异常不得拖垮整个 Home
- 内置 Widget 采用混合模型：轻量内置直挂宿主 React 树；Hexagram Board 与所有第三方/示例 Package 走 sandbox + 能力桥，以保证平台路径真实可用
- 不可见 Instance 默认挂起；相邻 Page 可预热，避免一次常驻全部 iframe
- 恶意或劣质包可调用桥所暴露的高权限能力；备份、禁用、日志与重置路径必须可靠

## Evidence

- Chrome MV3 的 `extension_pages` CSP 不能放宽到执行用户导入的任意 JS；unpacked 只额外允许 localhost 开发源：[Chrome CSP reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
- manifest sandbox 页面可运行独立代码，但没有 Extension API，也不能直接访问非 sandbox 页面，只能通过消息通信：[Chrome sandbox reference](https://developer.chrome.com/docs/extensions/reference/manifest/sandbox)
- MV3 service worker 不支持动态 `import()`，且必须属于 Extension package：[Chrome service worker basics](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)
- Chrome Web Store 的远程逻辑政策是另一层发布约束，不改变上述浏览器运行时边界：[MV3 Web Store requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
