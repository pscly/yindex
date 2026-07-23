# 仓库采用按功能切分的 monorepo，工具链为 Bun + Vite

yindex 代码组织采用 monorepo：按领域与功能拆成多个 packages（例如 extension 壳、domain、home host、widget-sdk、builtin widgets、style packs），而不是单一扁平 `src`。工具链采用 **Bun workspace + Vite multi-entry**：Bun 负责安装、脚本与 workspace 解析，Vite 负责 extension 多入口与 packages 构建。原因是产品同时包含 Home 宿主、编辑器、Package 运行时与内置 Widget；清晰包边界有利于独立测试、示例第三方包与后续 SDK 发布。

## Considered Options

- **单包扁平 src** — 起步最快，边界易糊
- **逻辑分层但仍单包** — 轻量，依赖方向需自律
- **按功能 monorepo packages（采纳）** — 工程更重，长期边界更稳
- **pnpm/npm workspace** — 可行；当前选择 Bun 优先本地速度
- **host + widget-sdk 双包** — 偏 SDK，内置与宿主边界仍可能缠在一起

## Consequences

- 包之间依赖方向必须单向：domain ← host/widgets，sdk ← packages
- CI 与本地脚本要支持按包测试与构建 extension 产物，并固定 Bun 版本
- 关键域以 TDD 推进；测试与实现分属可测 packages，避免只能在整扩展里手测
