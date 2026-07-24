# yindex

Chrome 新标签页扩展：可上下循环翻页的可组装主页（Home = Page Sequence + Widget Layout + Style）。

## 普通用户：从 GitHub 下载安装

Chrome **不能**直接拖入 zip 当作扩展安装。正确步骤：

1. 打开 [Releases](https://github.com/pscly/yindex/releases) 页面  
2. 下载 **`yindex-extension-vX.Y.Z.zip`**（或 `yindex-extension-latest.zip`）  
3. 解压得到文件夹 **`yindex-extension`**（内含 `manifest.json`）  
4. Chrome 打开 `chrome://extensions`  
5. 打开右上角 **开发者模式**  
6. **加载已解压的扩展程序** → 选择刚才的 `yindex-extension` 文件夹  
7. 打开新标签页即可使用

> 若从源码仓库下载「整个源码 zip」，那不是可加载扩展。请用 Releases 里的 **extension** 压缩包。

### 首次使用提示

| 操作 | 说明 |
|------|------|
| 滚轮 / ↑↓ / PgUp·PgDn | 整页循环翻页 |
| 右侧圆点 | 跳到指定页 |
| **编辑** | 拖拽/缩放小组件，吸附（按住 Alt 关闭吸附） |
| **设置** | 导航、导入导出配置、安装小组件包、重置 |
| 示例包 | 设置 → 小组件包 → 安装番茄钟示例 |

默认三页：

1. **知识·典籍**（inkstone）— 一言、六十四卦  
2. **启动·精密工具**（caliper，Landing）— 搜索、快捷方式、天气  
3. **氛围·沉浸光雾**（dew-glass）— 时钟  

配置仅存本机（`chrome.storage` / IndexedDB），不上传。

## 开发者

```bash
bun install
bun test
bun run build
# 产物：packages/extension/dist
bun run pack   # 测试 + 构建 + 生成 release/yindex-extension-v*.zip
```

Chrome → 扩展程序 → 开发者模式 → 加载 `packages/extension/dist`。

### 包结构

| 包 | 职责 |
|---|---|
| `@yindex/domain` | Page Sequence / Layout / Style / Home 配置与迁移（TDD） |
| `@yindex/style-packs` | Style Pack tokens |
| `@yindex/widget-sdk` | Package manifest、能力桥协议 |
| `@yindex/widgets` | 内置 Widget |
| `@yindex/extension` | MV3 壳 + newtab 宿主 |
| `examples/pomodoro` | 第三方示例包 |

详见 `docs/product-spec.md`、`DESIGN.md`、`docs/adr/`。

### 发版

```bash
# 本地打 zip
bun run pack

# 打 tag 触发 GitHub Actions 上传 Release 附件
git tag v0.1.0
git push origin v0.1.0
```
