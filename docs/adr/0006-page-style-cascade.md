# Widget 外观采用 Page Style 级联与实例覆盖

每个 Page 提供一组 Style tokens（色彩、字体、圆角、液态玻璃材质等），Widget Instance 默认继承；实例可以仅覆盖个别属性。套用新 Style Pack 时更新 Page tokens，但保留已有实例覆盖；编辑器标出覆盖状态，并提供「恢复跟随页面」。原因：既要保证整页换风格有一致效果，也不能抹掉用户的局部构图。

## Considered Options

- **Page 默认 + Instance 覆盖（采纳）** — 整体性与自由度平衡
- **强制全部统一** — 换风格最干净，个性化不足
- **Widget 完全自带外观** — 可移植但容易视觉割裂
- **换 Pack 时清空覆盖** — 一致但破坏用户调整

## Consequences

- Style 数据需区分 `page tokens` 与 `instance overrides`，不能只存最终计算值
- 编辑器需显示哪些属性来自 Page、哪些被 Instance 覆盖
- Widget Package 应声明它支持消费的宿主 tokens；未知 token 有稳定回退
