# yindex

Chrome 新标签页扩展：可上下翻页的可组装主页框架。每一页是独立风格与布局的画布，用户用滚轮（或等价手势）整页切换，可循环。

## Language

**Extension（扩展）**:
用户安装的 Chrome 新标签页扩展本体；接管 browser new tab 体验。
_Avoid_: 插件（口语可保留，文档与代码用 Extension）、应用、App

**Home（主页）**:
扩展打开后的整体体验空间，由一串可循环翻页的 Page 组成。
_Avoid_: 仪表盘（仅指某类 Page 用途）、站点

**Page（页）**:
Home 中的一整个全屏场景：有独立风格、独立布局、一组 Widget 布置；翻页时整页切换，不是页面内连续滚动。
_Avoid_: 标签、Tab、屏幕（Screen 仅作实现类比）、视图（过泛）

**Page Sequence（页序列）**:
Home 内 Page 的有序线性列表；用户可增删重排；配合 Loop 首尾相接。
_Avoid_: 轮播列表、幻灯片

**Widget（小组件）**:
放在某一 Page 上的可配置功能块（如六十四卦速见表、时钟、书签启动台）。Widget 属于某 Page 的布局，不是全局悬浮层（除非日后单独立项）。
_Avoid_: 插件、卡片（Card 仅作 UI 形态）、模块（过泛）、小工具

**Layout（布局）**:
某一 Page 上 Widget 的自由定位编排：位置与尺寸可拖拽调整，编辑时吸附对齐参考（安全边距、逻辑网格、其他 Widget 边/中心、三分线与黄金分割线）。
_Avoid_: 流式自动排版（非默认）、纯固定槽位模板

**Snap（吸附）**:
编辑 Layout 时，Widget 边缘/中心对齐到参考线或彼此边缘的对齐辅助行为。
_Avoid_: 磁吸（口语可保留）、自动排版

**Style（风格）**:
某一 Page 的视觉主题（唯美、科技、灵感等）：色、字体、壁纸、材质与动效气质。风格挂在 Page 上，页与页可以完全不同。
_Avoid_: 皮肤、主题（Theme 若与 Style 合并需再决议）、外观

**Style Pack（风格包）**:
一组可复用的 Style 预设（配色、字体、壁纸气质、液态玻璃参数等）；用户可一键套到某 Page，再深度自定义。
_Avoid_: 皮肤包、主题市场（若未做市场则不要用）

**Liquid Glass（液态玻璃）**:
一种强调半透明、折射/模糊、高光与流体感的视觉/动效气质；可作为某 Page Style 的材质语言，不是独立业务实体。
_Avoid_: 毛玻璃（仅指 blur 子集）、Glassmorphism（实现标签，产品语言优先用液态玻璃）

**Browse Mode（浏览态）**:
日常使用态：滚轮/手势翻页、与 Widget 交互；不以布局编辑为目的。
_Avoid_: 只读态（Widget 仍可交互）

**Edit Mode（编辑态）**:
显式进入的布局/风格编排态：拖放与缩放 Widget、吸附、套用/微调 Style、管理 Page 序列等。
_Avoid_: 设置页（Settings 是另一入口，可承载更重的配置）

**Settings（设置）**:
侧栏或全屏的配置入口；承载高级选项、资源管理、重置、导出导入、Widget Catalog 与高级选项等不宜在画布上完成的配置。
_Avoid_: 选项页 alone as only name（Chrome options 可实现，产品语言用 Settings）

**Page Turn（翻页）**:
用滚轮/手势在相邻 Page 之间做整页切换；观感接近手机换屏，而不是滚动长页。支持循环（末页的下一页是首页）。
_Avoid_: 滚动（Scroll 仅指 Page 内部若允许的局部滚动）、滑动（口语可保留）

**Loop（循环）**:
Page 序列首尾相接，可无限向同一方向连续翻页。
_Avoid_: 轮播、Carousel（若实现像 carousel，领域仍称 Loop）

**Hexagram Board（六十四卦 / 64卦小组件）**:
一种 Widget：提供六十四卦矩阵查询，并允许用户每日手动抽取一卦，阅读对应传统卦辞与象传；它是首发 Widget 之一，不是产品本体，也不提供个性化吉凶断言。
_Avoid_: 把 yindex 整体称为易经应用、把经典原文展示称为个性化解卦

**Wallpaper（壁纸）**:
某一 Page Style 的底层视觉背景（图/视频/生成纹理等）；全页铺底，不是可拖拽的普通 Widget。
_Avoid_: 背景 Widget（除非未来单独做覆盖层）、全局唯一壁纸（与「每页独立 Style」冲突时勿默认）

**Widget Type（小组件类型）**:
可安装/内置的一种 Widget 能力定义（如 Clock、Search、Hexagram Board）；描述它能做什么与可配置项 schema。
_Avoid_: 组件类名直接当产品词

**Widget Instance（小组件实例）**:
放在某一 Page Layout 上的具体 Widget：有位置尺寸、该实例自己的配置；同一 Type 允许在同一 Page 上多个 Instance，各有独立配置与布局。
_Avoid_: 与 Type 混称「组件」

**Widget Package（小组件包）**:
可导入的第三方（或官方分发的）Widget 静态包：含清单、资源与实现；用户从本地 zip/目录安装到 Extension。
_Avoid_: 插件包、扩展包（易与 Chrome Extension 混淆）、远程脚本

**Widget Catalog（小组件目录）**:
当前 Extension 内已安装/可用的 Widget Type 集合（内置 + 已导入包）。
_Avoid_: 应用商店（若未做在线市场则不要用 Store 作默认名）

**Missing Widget（缺失小组件）**:
某个 Widget Instance 引用的 Package 当前未安装时显示的占位状态；保留原实例配置与 Layout，重装同一 Package 后可恢复。
_Avoid_: 已删除 Widget、损坏数据（Package 缺失不等于实例数据丢失）
