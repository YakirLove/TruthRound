# 新增案件指南

这份指南面向下载源码的玩家和协作 Agent。当前版本通过源码注册案件；只有编译好的应用时，请先获取源码，再完成下面步骤并重建游戏。

## 1. 准备一个可推理的故事

先写清楚：发生了什么、真实经过、每个人看到什么、谁会隐瞒什么，以及玩家如何从公开信息和证据得出裁决。建议从 1 名民警、2～4 名涉事人物、少量初始证据和 2～3 条可发现证据开始。

公开报案与初始口供应提出问题，不能直接解释完整作案过程。角色 `privateFacts` 只放本人知道的事；不能把全案真相分发给每个人。误导人物也要有可被核查的说法。

## 2. 创建案件文件

复制 [模板](examples/case.template.yaml) 到：

```text
src/game/case-packs/<case-id>/case.yaml
```

模板是未注册的作者示例，使用已有素材以便验证。它不会自动新增到游戏中。请替换故事、ID 和文案；需要原创美术时按下一节添加素材。

当前使用 `schemaVersion: 1` 的**平铺结构**。顶层没有旧版本提示词中的 `metadata`、`briefing`、`phases` 或 `solutionChain`。

| 字段 | 写什么 |
| --- | --- |
| `id`、`version` | 稳定案件 ID、内容版本，例如 `courtyard-umbrella` / `1.0.0` |
| `schemaVersion` | 固定为 `1` |
| `title`、`summary`、`difficulty`、`tags` | 选案标题、短简介、1～5 难度与标签 |
| `incidentSummary`、`reportText` | 玩家可读的案情和报案背景 |
| `reporter` | `name`、`identity`、`statement`、`concern`、有效 `portrait` 路径 |
| `involvedParties` | 已存在的 `characterId`、关系和请到圆桌的原因 |
| `characters` | 人物公开背景、自己的私密事实、话术、开场白和美术路径 |
| `evidence` | 初始证据及可发现证据，带稳定 ID 与核实内容 |
| `sceneAssets` | 五个必需的场景路径，可复用同一张场景图 |
| `truthTimeline`、`verdict` | 作者真相与结案答案，供规则和结案使用 |

人物字段以 `src/game/caseSchema.ts` 为准：

- `roleType` 可为 `police`、`culprit`、`accomplice`、`witness`、`innocent`；民警不会参与可盘问人物的归类。
- `portrait`、`avatar` 均须填写存在的图片路径，可指向同一张 PNG；不是 `null`。
- `publicBackground`、`visibleFacts` 是当前人物可公开讲述的信息；`privateFacts` 是本人私下知道的事实。
- `personality`、`emotion`、`lieStrategy`、`speechStyle` 和 `openingStatement` 都须填写。
- `verdict.culpritId` 对应一名主谋；`accompliceIds` 和 `innocentIds` 可为空数组。三组合起来必须不重复、恰好覆盖全部非民警人物；目击者也归入其实际裁决类别。

证据要满足：

- `stage: initial` 表示开局已核实；`stage: unlockable` 表示先盘问发现，再由玩家申请核实。
- `provider` 使用 `police` 或 `ai2_or_police`；可发现证据必须填写 `triggerHint`。
- `vagueLabel` 是未发现时的模糊名称；`discoveryLabel` 是发现后的核查方向。两者都应避免暴露隐藏核实结果。
- `content` 才是核实后显示的事实。证据检测只接收 ID 与触发方向，不读取隐藏 `content`。
- `requiresEvidenceIds` 表示这些证据必须先被核实，才能发现当前证据；引用必须存在且不能形成循环。

案件 ID 在所有已注册案件中唯一；人物和证据 ID 在各自案件内唯一。修改已发布案件的核心内容时，更新 `version`；当前存档严格检查案件版本，不会自动迁移不兼容旧档。

## 3. 准备素材

建议目录：

```text
src/game/case-packs/<case-id>/
├── case.yaml
└── assets/
    ├── characters/    # 透明底人物 PNG
    └── scenes/        # 场景 PNG
```

YAML 里填写源码逻辑路径，例如：

```yaml
portrait: /src/game/case-packs/courtyard-umbrella/assets/characters/owner.png
avatar: /src/game/case-packs/courtyard-umbrella/assets/characters/owner.png
```

`sceneAssets` 必须包含 `storefront`、`roundtable`、`evidenceBoard`、`verdictDesk`、`verdictResult`。当前阶段主要显示首页、圆桌、裁决和结案场景，报案使用圆桌场景搭配报案人立绘；五项仍均需有效路径。

在 `scripts/optimize-assets.mjs` 的案件 ID 数组中加入新案件，再执行：

```bash
npm run assets:optimize
```

例如上述人物路径会生成：

```text
src/assets/optimized/game/case-packs/courtyard-umbrella/assets/characters/owner.webp
```

原始 PNG 和生成的 WebP 都要随新案件提交。模板复用的已有素材已经有对应 WebP；不能只填一个文件名、绝对本机路径或远程 URL。

仅使用你有权提供的素材，并在 `docs/THIRD_PARTY.md` 记录新增素材来源、作者与许可。`materials/` 可本地保存创作素材，已被 Git 忽略，游戏不读取它。

## 4. 注册到案件列表

编辑 `src/game/cases.ts`，在现有导入后加上：

```ts
import custom from './case-packs/courtyard-umbrella/case.yaml?raw'
```

在 `loadCase` 定义后建立案件：

```ts
export const courtyardUmbrellaCase = loadCase(custom)
```

把构建可玩条目的数组由：

```ts
[demoCase, wutongClinicCase]
```

改为：

```ts
[demoCase, wutongClinicCase, courtyardUmbrellaCase]
```

新条目会沿用 `status: 'unlocked'`、YAML 元数据和素材校验。新增第三案时，可将占位卡数组 `[3, 4, 5]` 改为 `[4, 5]`，避免仍显示多余的「卷宗三」占位。

Pixi’VN 引擎会从案件列表构造资源 bundle 和人物注册，不需要再为每张图手写引擎注册代码。存档也根据案件 ID 查找数据。

## 5. 检查两个扩展限制

**地点文案。** `src/App.tsx` 的圆桌地点目前使用两案判断，新案件需补充该处，确保显示自己的地点；首页「灯笼巷」是整体世界观文案，可按项目需要保留。

**报案长度。** 报案总条数为：

```text
2 + involvedParties.length + 初始证据数量
```

`src/game/saves.ts` 当前允许 `reportStep` 为 0～10，因此总条数应不超过 11。更长案件要先调整该限制并验证保存、恢复、上一条和直接跳转；不能只让页面显示正常，却导致后几条无法存档。

## 6. 校验和试玩

开发环境可直接调用现有校验器检查一个 YAML，Node 24+ 下执行：

```bash
node --input-type=module -e "import fs from 'node:fs'; import { parse } from 'yaml'; import { validateCase } from './src/game/caseSchema.ts'; const c = validateCase(parse(fs.readFileSync('src/game/case-packs/courtyard-umbrella/case.yaml', 'utf8'))); console.log(c.id);"
```

该命令校验数据结构、引用和证据前置关系；素材存在性还须由游戏加载与构建确认。

```bash
npm test
npm run lint
npm run build
npm run dev
```

为新案件补充规则测试：正确裁决、错误裁决、证据阶段与前置条件、研判不含隐藏信息、存档保存恢复。既有测试只覆盖已有案件，全部通过不等于新案件已经完整验收。

实际试玩时检查：选案能进入；所有报案步骤可往返；每个人物能单问、群问和被引用追问；证据按设计顺序发现与核实；札记引用可见来源；刷新/读档后进度恢复；完整归类后得到预期评分。没有 AI 密钥时可验证规则和界面，并明确记录真实问话尚未验证。

只交付新增案件及必要接入改动。把新增素材和可公开的说明加入 Git；密钥、原始转写、玩家存档和本机产物继续保留在本地。

给 Agent 的可复制指令以 [README 对应章节](../README.md#复制给-agent-的指令) 为准。
