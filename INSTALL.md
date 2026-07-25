# yindex 安装说明（Chrome）

## 下载

从 [GitHub Releases](https://github.com/pscly/yindex/releases) 下载：

- `yindex-extension-v*.zip`

## 安装

1. 解压 zip，得到固定文件夹 `yindex-extension/`
   - 确认该文件夹**直接**包含 `manifest.json`（不要多嵌套一层）
2. 打开 Chrome：`chrome://extensions`
3. 开启 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择 `yindex-extension` 文件夹
6. 打开**新标签页**

## 注意

- 不要加载整个源码仓库目录
- 不要只解压后选择 zip 文件本身
- 若更新 Extension：退出正在打开的 Home，重新下载 zip，覆盖同一个 `yindex-extension/` 文件夹，再到扩展页点「重新加载」；不要改名或换目录

## 卸载 / 重置

- 扩展页移除即可；配置在本机存储中
- 应用内「设置 → 恢复默认三页」可重置 Home
