# 开发进度记录：2026-05-17

## 今日目标

把《真相圆桌》从纯文字 MVP 推进到更游戏化的第一案体验，同时继续保留核心玩法闭环：报案、圆桌盘问、自由追问、证据触发、线索研判、最终裁决。

## 今日已完成

- 新增游戏首页。
  - 使用主题封面图。
  - 展示游戏名、玩法简介和开始游戏入口。

- 新增案件选择页。
  - 当前展示 5 个案件位。
  - 第一案可进入。
  - 案件二到案件五为锁定占位。

- 改造第一案报案页。
  - 使用老街小卖部门口背景。
  - 展示报案人刘婶立绘。
  - 展示案情卷宗、涉及人员和老周已确认的基础证据。

- 整理第一案素材结构。
  - 第一案素材统一放入 `src/assets/cases/missing-lantern-parcel/`。
  - 保留透明底人物图、场景图和首页封面图。
  - 删除未使用的绿幕图、raw 源图、Vite 默认图标和 `.DS_Store`。

- 改造圆桌主游戏画面。
  - 去掉圆桌页顶部应用导航栏。
  - 去掉玩家界面的 DeepSeek 标识。
  - 背景图铺满整个圆桌页。
  - 左侧改成人物选择列表。
  - 右侧改成大面积聊天记录区。
  - 当前盘问对象名字使用聊天用户名同款黄色高亮。
  - 鼠标悬停人物时只轻微放大。
  - 当前盘问对象才显示外发光效果。

- 优化线索研判展示。
  - 玩家界面不再出现“AI2”。
  - 功能入口改为「线索研判」。
  - 展开面板改为「侦探札记」。
  - 保持时间线、矛盾点、嫌疑点、线索缺口四块结构化输出。

- 优化案情档案。
  - 案情详情默认收起。
  - 点击「案情档案」打开抽屉。
  - 可查看报案人、案情简介、人物关系、基础证据和关键证据槽。

- 增加关键证据触发反馈。
  - 盘问后如果触发新的关键证据方向，会弹出提示框。
  - 弹框只显示模糊证据名，例如「证据一」，不提前暴露证据内容。
  - 增加 Web Audio 合成提示音。
  - 可从弹框直接打开案情档案。

- 保持真实 DeepSeek 请求链路。
  - 角色演绎继续走 `roleplay`。
  - 线索研判继续走 `assistant_summary`。
  - 证据触发检测继续走 `evidence_check`。
  - 未启用运行时 Mock 兜底。

## 当前可玩流程

1. 首页点击「开始游戏」。
2. 案件选择页进入第一案。
3. 阅读街坊报案。
4. 进入圆桌盘问。
5. 选择人物并自由输入问题。
6. 引用已有发言继续追问。
7. 盘问过程中触发关键证据提示。
8. 打开案情档案核实证据。
9. 打开线索研判整理信息。
10. 进入裁决页提交判断。
11. 查看评分和结案反馈。

## 当前素材使用情况

实际保留并使用的素材：

- `src/assets/game-cover.png`
- `src/assets/cases/missing-lantern-parcel/characters/chen.png`
- `src/assets/cases/missing-lantern-parcel/characters/lin.png`
- `src/assets/cases/missing-lantern-parcel/characters/liu.png`
- `src/assets/cases/missing-lantern-parcel/characters/qiao.png`
- `src/assets/cases/missing-lantern-parcel/characters/wu.png`
- `src/assets/cases/missing-lantern-parcel/characters/zhou.png`
- `src/assets/cases/missing-lantern-parcel/scenes/storefront.png`
- `src/assets/cases/missing-lantern-parcel/scenes/roundtable-office.png`
- `src/assets/cases/missing-lantern-parcel/scenes/evidence-board.png`

已删除未使用素材：

- 绿幕人物图目录。
- raw 人物源图目录。
- Vite 默认 `react.svg`、`vite.svg`。
- 未使用的 `hero.png`。
- `.DS_Store` 文件。

## 今日验证

已多次执行并通过：

```bash
npm test
npm run lint
npm run build
```

曾执行并通过：

```bash
cd src-tauri && cargo check
```

## 下一步建议

- 用 Tauri 桌面端完整跑一遍真实 DeepSeek 流程，重点验证证据触发弹框和提示音。
- 继续游戏化裁决页，让“主谋 / 包庇者 / 无辜者”归类更像结案板。
- 给人物增加表情变体或说话状态。
- 给证据核实增加更强的动画演出。
- 增加第二案数据模板，验证案件扩展能力。
