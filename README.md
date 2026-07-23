# yindex

Chrome 新标签页扩展：可上下循环翻页的可组装主页。

## 开发

```bash
bun install
bun test
bun run build
```

产物在 `packages/extension/dist`。Chrome → 扩展程序 → 开发者模式 → 加载已解压的扩展程序 → 选择该目录。

## 包结构

| 包 | 职责 |
|---|---|
| `@yindex/domain` | Page Sequence / Layout / Style / Home 配置与迁移（TDD） |
| `@yindex/style-packs` | 三材质 Style Pack tokens |
| `@yindex/widget-sdk` | Package manifest、能力桥协议 |
| `@yindex/widgets` | 内置 Widget 实现 |
| `@yindex/extension` | MV3 壳 + newtab 宿主 |
| `examples/pomodoro` | 第三方示例包 |

详见 `docs/product-spec.md`、`DESIGN.md`、`docs/adr/`。
