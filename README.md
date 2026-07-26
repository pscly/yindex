# yindex

Chrome 新标签页 Extension：可上下循环翻页的可组装主页。Home 由 Page Sequence、Widget Layout 与每页独立的 Style 组成。

## v0.2 · Liquid Glass

yindex 的视觉母语是统一的 **Liquid Glass（液态玻璃）**：Wallpaper 是窗外的世界，Widget 是浮在窗上的玻璃透镜。所有 Page 共用同一套半透明、模糊、边缘高光与 Adaptive Glass 可读性保护；场景差异来自 Wallpaper 光场、色调、字体与构图，而不是切换材质系统。

默认 Home 有三个 Page：

1. **此刻（MOMENT，Landing）**：晨光场；日期天气、搜索与快捷方式
2. **灵感（MUSE）**：暖墨场；每日一句与六十四卦
3. **流光（FLOW）**：深海夜光场；大时钟与沉浸 Wallpaper

默认使用本机实时渲染的 Generative Wallpaper。用户也可以为任一 Page 导入本地图片或视频 Wallpaper；媒体保存在本机 OPFS，不会上传。Extension 申请 `unlimitedStorage` 以承载本地媒体与小组件包，实际可用空间仍受设备剩余空间与浏览器存储策略约束。

玻璃档位为 **清透 / 均衡（默认）/ 沉静**。Adaptive Glass 会根据 Wallpaper 明暗与细节自动守住内容对比度；高级微调不会关闭最低可读性保护。

## 普通用户：从 GitHub 安装

Chrome **不能**直接把 zip 当作 Extension 安装。Release 压缩包固定展开为 `yindex-extension/`，这也是打包脚本的输出目录名。

1. 打开 [GitHub Releases](https://github.com/pscly/yindex/releases)
2. 下载 `yindex-extension-vX.Y.Z.zip`（或 `yindex-extension-latest.zip`）
3. 解压，并把得到的 **`yindex-extension/`** 放到一个不会改名或移动的固定位置
4. 确认 `yindex-extension/manifest.json` 直接存在，没有多嵌套一层目录
5. 在 Chrome 打开 `chrome://extensions`
6. 开启右上角 **开发者模式**
7. 点击 **加载已解压的扩展程序**，选择固定的 `yindex-extension/` 文件夹
8. 打开新标签页

> 从 GitHub 下载的「Source code」压缩包不是可加载产物。请使用 Release 附件中的 `yindex-extension-*.zip`。

### 更新：覆盖同一个文件夹

Chrome 会持续跟踪首次加载的目录。更新 v0.2 及后续兼容版本时：

1. 关闭正在打开的 yindex Home
2. 解压新 Release
3. 用新包中的内容**覆盖原来同一路径的 `yindex-extension/` 文件夹**，不要创建版本号目录，也不要改名或移动原目录
4. 回到 `chrome://extensions`，在 yindex 上点击 **重新加载**
5. 再打开新标签页

### 从 v0.1.x 升级

**v0.1.x 是内部开发快照，与 v0.2 不兼容。** v0.2 不承诺迁移旧 Home schema、Style、Wallpaper 引用或导出文件。不要把 v0.1.x 导出的配置导入 v0.2；需要保留的内容请先自行记录，然后移除旧 Extension、清除旧本地数据并按上面的固定文件夹流程全新安装。

完整说明见 [`INSTALL.md`](./INSTALL.md)。

## 首次使用

| 操作 | 说明 |
|---|---|
| 滚轮 / ↑↓ / PgUp·PgDn | 在相邻 Page 间整页翻页，首尾循环 |
| 右侧圆点 | 跳到指定 Page |
| **编辑** | 拖拽/缩放 Widget；按住 Alt 临时关闭 Snap |
| **设置** | 管理导航、Glass Profile、Wallpaper 资源、导入导出、Widget Package 与重置 |
| 示例包 | 设置 → 小组件包 → 安装番茄钟示例 |

Home 配置、Wallpaper 与 Package 资源仅保存在当前浏览器本机。配置导出不包含 OPFS Wallpaper 或 Widget Package 资源，不能当作完整媒体备份。

## 开发者

```bash
bun install
bun test
bun run typecheck
bun run build
# 开发构建：packages/extension/dist/
bun run pack
# 可加载目录：release/yindex-extension/
# Release 压缩包：release/yindex-extension-vX.Y.Z.zip
```

开发构建可在 Chrome → 扩展程序 → 开发者模式中加载 `packages/extension/dist/`。`bun run pack` 会先测试和构建，再生成与 GitHub Release 相同结构的 `release/yindex-extension/` 及 zip。

### 包结构

| 包 | 职责 |
|---|---|
| `@yindex/domain` | Page Sequence / Layout / Style / Home 配置与迁移 |
| `@yindex/style-packs` | MOMENT / MUSE / FLOW Style Pack |
| `@yindex/widget-sdk` | Widget Package manifest 与能力桥协议 |
| `@yindex/widgets` | 内置 Widget |
| `@yindex/extension` | Chrome MV3 壳与 new tab 宿主 |
| `examples/pomodoro` | 第三方示例 Widget Package |

当前产品与设计权威见 [`PRODUCT.md`](./PRODUCT.md)、[`docs/product-spec.md`](./docs/product-spec.md)、[`DESIGN.md`](./DESIGN.md) 与 [`docs/adr/`](./docs/adr/)。

### 发版

> **人工发布门禁：** 创建 tag、推送 tag 与发布 GitHub Release 都必须先获得明确人工确认。自动化只响应已确认的 tag push，不得自行创建或推送 tag。

```bash
# 本地生成固定根目录与 zip
bun run pack

# tag 触发 GitHub Actions 上传 Release 附件
git tag v0.2.0
git push origin v0.2.0
```
