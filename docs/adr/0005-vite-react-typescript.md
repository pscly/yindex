# Extension 前端使用 Vite + React + TypeScript

yindex 的 new tab Home 与编辑界面使用 Vite、React、TypeScript。原因：Page/Widget/编辑态是强交互状态树；React 生态适合画布、拖拽与可组合 Widget 宿主，TypeScript 用于固定跨边界 schema（Page、Widget Package、存储迁移）。

## Considered Options

- **Vite + React + TypeScript（采纳）** — 生态与复杂 UI 能力均衡
- **Vue + TypeScript** — 同样可行，但当前无更强偏好
- **Svelte + TypeScript** — 更轻，生态选择略窄
- **原生 TypeScript** — 依赖少，编辑器复杂度会转为自研成本
