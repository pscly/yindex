# yindex 安装说明（Chrome）

本文适用于 GitHub Release 提供的 unpacked Chrome Extension。Chrome 不能直接安装 zip；必须解压后加载固定目录。

## 1. 下载正确的产物

从 [GitHub Releases](https://github.com/pscly/yindex/releases) 下载以下任一附件：

- `yindex-extension-vX.Y.Z.zip`
- `yindex-extension-latest.zip`

不要下载 GitHub 自动生成的 `Source code (zip)`：源码仓库不是 Chrome 可直接加载的 Extension 产物。

Release zip 与 `bun run pack` 使用同一结构：

```text
yindex-extension/
├── manifest.json
├── newtab.html
├── background.js
└── ...
```

仓库内对应的已解压打包目录是 `release/yindex-extension/`。

## 2. 首次安装

1. 解压 Release zip。
2. 将得到的 **`yindex-extension/`** 放到一个长期固定的位置；后续不要改名或移动。
3. 确认 `manifest.json` 直接位于 `yindex-extension/manifest.json`，没有多嵌套一层同名目录。
4. 在 Chrome 打开 `chrome://extensions`。
5. 开启右上角 **开发者模式**。
6. 点击 **加载已解压的扩展程序**。
7. 选择固定的 `yindex-extension/` 文件夹，而不是 zip、源码仓库或文件夹里的单个文件。
8. 打开一个新标签页；Chrome 会由 yindex 接管 new tab。

## 3. 更新 v0.2 及后续兼容版本

Chrome 跟踪的是首次加载的文件夹路径。为了让「重新加载」使用新文件，请始终覆盖同一个目录：

1. 关闭正在打开的 yindex Home。
2. 下载并解压新版 Release zip。
3. 把新包中的文件**覆盖到原先加载的同一个 `yindex-extension/` 文件夹**。
   - 不要创建 `yindex-extension-v0.2.1/` 一类新目录。
   - 不要删除旧目录后把新目录放到另一路径。
   - 覆盖完成后，原路径仍须直接包含新版 `manifest.json`。
4. 回到 `chrome://extensions`，在 yindex 上点击 **重新加载**。
5. 再打开新标签页。

如果误把新版解压到别处，Chrome 仍会加载旧路径。请覆盖原目录，或先在扩展页移除旧条目，再从新固定目录重新加载。

## 4. v0.1.x 不兼容

**v0.1.x 是内部开发快照，不是兼容性基线。v0.2 与 v0.1.x 不兼容。**

v0.2 的 Home schema、默认 Page Sequence、Style、Wallpaper 引用和本地存储结构可以替换 v0.1.x 数据。升级时：

1. 手动记录需要保留的信息；不要依赖 v0.1.x 导出文件可被 v0.2 导入。
2. 在 `chrome://extensions` 移除旧 Extension。
3. 清除旧版本的本地数据；或在旧版本仍可运行时使用其完全重置入口。
4. 按「首次安装」步骤加载 v0.2 的固定 `yindex-extension/` 文件夹。

该决定记录在 [`docs/adr/0010-no-backward-compatibility-before-public-release.md`](./docs/adr/0010-no-backward-compatibility-before-public-release.md)。

## 5. 本地数据与权限

- Home 配置保存在 `chrome.storage`。
- 本地导入的图片与视频 Wallpaper 保存在 OPFS。
- Widget Package 资源保存在 IndexedDB。
- 所有这些数据只在当前浏览器本机使用，不会由 yindex 上传。
- Extension 声明 `unlimitedStorage`，用于降低本地 Wallpaper 与 Package 资源被常规配额阻断的风险；它不代表磁盘无限，实际容量仍受设备剩余空间和 Chrome 存储策略限制。

移除 Extension 可能同时移除其本地数据。Settings 只导出 Home 配置；请另行保留原始图片、视频与 Widget Package 文件。

## 6. 卸载与重置

- **恢复默认主页**：Settings 中恢复默认三个 Page，保留 Wallpaper 与 Widget Package 资源。
- **完全清除**：Settings 中永久清除 Home、所有 Wallpaper 与所有 Widget Package，再恢复默认 Home。
- **卸载**：在 `chrome://extensions` 移除 yindex；先导出 Home 配置，并另行保留原始图片、视频与 Widget Package 文件。

默认三个 Page 是 **此刻 / 灵感 / 流光**，并共用统一 Liquid Glass 与 Adaptive Glass 可读性保护。

## 7. 常见问题

### Chrome 提示找不到 manifest

选择层级不正确。应选择直接包含 `manifest.json` 的 `yindex-extension/` 文件夹。

### 更新后界面仍是旧版

确认新版内容覆盖的是 Chrome 当前跟踪的同一路径，然后在 `chrome://extensions` 点击 **重新加载**；必要时关闭所有旧 Home 后再打开新标签页。

### 能否直接加载 `release/yindex-extension/`

可以。它是 `scripts/pack-extension.sh` 生成的固定打包目录，结构与 Release zip 解压后的 `yindex-extension/` 完全一致。
