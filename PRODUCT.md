# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

yindex v1 首先服务作者本人和开发者朋友。他们愿意通过 Chrome 开发者模式加载 unpacked Extension，也愿意从本地 zip/目录导入高信任的第三方 Widget Package；需要的是高度可编排、可扩展的个人新标签页，而不是零配置的大众商店产品。

## Product Purpose

yindex 接管 Chrome 新标签页，将其变成可组装的 Home：用户在多个全屏 Page 上自由布置 Widget，为每个 Page 赋予独立 Style，并以纵向整页切换在知识、启动与氛围场景之间移动。

v1 成立标准（完整纵切）：

1. 默认三页、不同 Style、可循环翻页  
2. 可编辑 Layout 与 Style  
3. 核心内置 Widget 可用  
4. 可导入并运行至少一个第三方示例 Package  
5. 重开新标签页后配置不丢失  

## Positioning

yindex 不是固定仪表盘，也不是单一主题的新标签页。它把 Home 建模为可循环的 Page Sequence：每一 Page 都是独立 Style 与自由 Layout 的全屏场景，由同一宿主与编辑系统管理；第三方能力通过本地 Package + sandbox + 能力桥扩展。

## Operating Context

- 用户通过 Chrome 新标签页高频进入 Home  
- Browse Mode：纵向 Page Turn 与 Widget 交互  
- Edit Mode：拖放、缩放、吸附、层级、Style 与 Page Sequence  
- Settings：高级配置、Catalog、资源、重置、导出导入  
- 默认空间：上知识｜中启动（Landing）｜下氛围  
- 原始素材：`1784710540_1784710529242_d.png`（六十四卦名速见表）服务 Hexagram Board，不是产品本体  

## Capabilities and Constraints

- Chrome MV3，仅 Chrome；开发者模式 unpacked；无 Store 上架承诺  
- Vite + React + TypeScript；Bun monorepo + Vite multi-entry；关键域 TDD  
- Page Sequence 有序可循环，至少一页；Page 有名称与图标  
- Layout：视口百分比坐标、自由定位、Snap、可重叠与 z 层级、多选对齐、不旋转  
- Style 属 Page；Pack + 深度自定义；tokens 分组见产品规格；Wallpaper 属 Style  
- 配置在 `chrome.storage`；Package 资源 IndexedDB；Wallpaper 媒体 OPFS  
- 支持轻量 JSON 导出与可选完整 zip；schemaVersion + 分模块 migration  
- 内置：时钟、搜索、快捷方式、每日一句、天气（直挂）；Hexagram Board（SDK）  
- Hexagram：每日手动抽本卦、矩阵、全屏/独立页卦库、公版原文+简注、长期笔记+日日志；无个性化吉凶；动爻后置 v1.1  
- 第三方：本地导入；sandbox + 类型化宽能力桥；包声明权限并在导入时授权；实例级 iframe 与错误隔离  
- UI 仅中文；WCAG 2.2 AA 自检；reduced-motion 降级动效与视频壁纸  
- 暖启动目标：本地配置下 Landing 首屏可交互 < 300ms  

## Brand Commitments

- 产品名：yindex  
- 页与页可以是完全不同的视觉世界  
- Liquid Glass 是可选材质语言，默认强调于氛围页，不是所有控件的默认装饰  
- Page Turn 接近手机换屏，方向纵向，不是长页滚动  
- 对第三方必须说清「导入即信任其经桥获得的能力」；sandbox 是执行边界，不是「无能力」  

视觉世界已提交为 **三材质三联画**（见 `DESIGN.md`）：知识·墨石 / 启动·卡尺 / 氛围·露珠 + 编辑器·石墨壳。

## Evidence on Hand

- 卦表素材：`1784710540_1784710529242_d.png`  
- 产品规格：`docs/product-spec.md`  
- 架构决策：`docs/adr/`  
- 尚无实现代码、真实用户数据或已验证视觉系统；不得虚构  

## Product Principles

1. **页是场景，不是容器列表。**  
2. **浏览顺滑，编辑显式。**  
3. **默认可用，深度可塑。**  
4. **用户数据可恢复。**（自动保存、撤销、原子升级、Missing Widget、导出）  
5. **信任边界说真话。**  

## Accessibility & Inclusion

v1 以 WCAG 2.2 AA 自检：主路径键盘可达、焦点可见、语义标签；系统 reduced-motion 时 Page Turn 改为淡入/瞬切，动态/视频 Wallpaper 降级静态封面；各 Style Pack 满足正文对比底线。
