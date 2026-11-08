# 真相圆桌 · TruthRound

**一张圆桌，几段口供，一件未了的事。**

一款中文 AI 轻推理游戏。你在老街事务所受理日常纠纷，与当事人自由交谈，引用口供追问、申请核实证据，再亲自判断谁是主谋、谁在包庇、谁是无辜者。

![老街事务所场景](src/assets/game-cover.png)

当前版本 **0.2.0**，包含《灯笼巷丢失的蓝色快递》《梧桐镇诊所金戒指失踪案》两个可玩案件。本地网页和 macOS 桌面端均支持真实 AI 对话。你也可以下载源码，自己编写案件，或让 Agent 帮你制作。

[快速开始](#快速开始) · [怎么玩](#怎么玩) · [自己添加案件](#自己添加案件) · [复制给-agent-的指令](#复制给-agent-的指令) · [代码结构](#代码结构) · [开发指南](docs/ARCHITECTURE.md)

## 有哪些功能

- 老街国风场景、人物立绘与转场，提供分步报案和卷宗式选案。
- 自由提问、单人盘问、依次询问所有人、引用原话追问。
- 证据按「未发现 → 待核实 → 已核实」推进，发现后再请民警核实。
- 侦探札记整理已知口供和已核实证据，条目可查看来源。
- 拖放或点击归类人物，提交裁决后查看评分与完整真相。
- 一个自动存档、三个手动档，支持 JSON 导出与跨端导入。
- 字号、文字显示速度、音量、静音与减少动画设置。

## 快速开始

### 从源码运行本地网页

准备 **Node.js 24+** 和 npm。安装了 nvm 的用户可用 `nvm use` 读取仓库的 `.nvmrc`；其他用户直接使用已安装的 Node 24+。

```bash
git clone https://github.com/YakirLove/TruthRound.git
cd TruthRound
npm ci
cp .env.example .env
```

在 `.env` 中填写你自己的 DeepSeek API Key：

```dotenv
DEEPSEEK_API_KEY=在这里填写你自己的密钥
```

已有 `.env` 时保留原文件，不重复覆盖。随后启动：

```bash
npm run dev
```

打开 **http://127.0.0.1:5183**。没有配置密钥时可浏览界面，真实问话需要有效密钥和网络。问话内容、角色上下文与研判来源会发送到 DeepSeek，调用使用你自己账户的额度。

要体验构建后的网页：

```bash
npm run build
npm run preview
```

打开 **http://127.0.0.1:4183**。开发与预览服务都包含本机 AI 代理；单独打开 `dist/index.html` 或只部署静态文件不能调用 AI。修改 `.env` 后重启服务。

### macOS 桌面版

已有 `TruthRound.app` 的用户可直接打开应用，在「设置 → AI 连接」填写自己的密钥。密钥保存在系统钥匙串。

从源码运行桌面版还需要 Rust 稳定版和 Xcode Command Line Tools：

```bash
npm run tauri dev
```

生成 Mac 开发应用：

```bash
npm run tauri build -- --debug --bundles app --no-sign
```

应用位于 `src-tauri/target/debug/bundle/macos/TruthRound.app`，可复制到 Applications。开发包未做发行签名或公证。开发构建可读取项目 `.env`，发布构建只读取钥匙串；分发应用时不附带密钥。

目前已验收的环境为 macOS Apple Silicon 和本机 Chromium 网页。仓库不附带本地安装包；在源码目录运行上述命令即可构建。

## 怎么玩

1. 点击「开始新调查」，选择可受理的案件。
2. 阅读报案人、相关人物和基础证据。「上一条」可回看，底部进度条可直接跳转，也可跳过演出。
3. 选择人物并提问，或切换「询问所有人」。点击某条口供的「引用追问」可带上原话。
4. 盘问发现证据方向后，在卷宗的证据页请民警核实。
5. 需要整理信息时打开「侦探札记」，查看记录及其来源。
6. 进入裁决，通过拖放，或先点人物再点类别，将所有人物归类后提交。

默认桌面窗口为 1280×800，最小 1024×700；网页窄窗口可展开侧边卷宗。

## 存档与 AI

调查进度保存在当前端的 IndexedDB。开发端口、预览端口和桌面端分别保存；跨端使用「存读档」中的导出、导入。损坏或版本不兼容的存档会在替换当前进度前被拦截。

中断的问话恢复为可手动重试，群问只重试失败人物。存档不含密钥；清理浏览器站点数据前，可先导出备份。

角色只接收自己的角色知识和公开对话。研判只接收已展示口供与已核实证据，显示内容从所引用的来源重建。案件真相用于规则和结案反馈。AI 模型与提示词位于 [`shared/ai-presets.json`](shared/ai-presets.json)，网页与 Rust 后端共用配置。

## 自己添加案件

**可以，通过修改源码添加。** 当前打包后的游戏没有案件热加载功能：把 YAML 放在 `.app` 旁边不会自动出现。下载源码后，可自己修改，或把下一节指令和案件素材交给 Agent。

一个新案件需要完成四件事：

1. 在 `src/game/case-packs/<case-id>/case.yaml` 编写人物、公开信息、私密知识、证据链及裁决答案。
2. 在 `src/game/cases.ts` 导入、校验并加入可选案件列表。
3. 准备人物与场景 PNG，登记到素材优化脚本并生成对应 WebP。
4. 检查圆桌地点文案、存档兼容与测试，再重新构建游戏。

完整步骤、字段说明和注意点见 **[新增案件指南](docs/ADDING_CASES.md)**。可从 **[可校验的案件模板](docs/examples/case.template.yaml)** 开始，也可参考已有案件的数据结构；这些作者文件包含真相，游玩前阅读会剧透。

### 复制给 Agent 的指令

将下面整段复制给 Codex、Claude Code 或其他有权操作你本地源码的 Agent，再填写案件素材：

```text
请为我本地的《真相圆桌 TruthRound》源码新增一个完整可玩的案件。

案件素材：<在这里填写故事、人物、疑点、证据和期望真相；没有确定的细节请合理补全，并在交付时说明>
新案件 ID：<英文小写与连字符，例如 courtyard-umbrella>

先阅读 README.md、docs/ADDING_CASES.md 和 docs/examples/case.template.yaml；
再核对 src/game/caseSchema.ts、src/game/types.ts、src/game/cases.ts、
scripts/optimize-assets.mjs、src/game/logic.ts、src/game/saves.ts 及相关测试。
以实际 schema 和现有实现为准完成以下工作：

1. 设计可由公开信息和证据推出的真相、角色各自知道的事、初始口供、
   证据触发方向与最终归类。公开报案和初始口供不能直接透露答案。
2. 在 src/game/case-packs/<case-id>/case.yaml 创建 schemaVersion: 1 的平铺结构，
   使用稳定且不冲突的 ID。至少包含一名 police 和可盘问人物；
   verdict 必须恰好覆盖全部非警察人物。私密事实只写入对应人物的 privateFacts。
3. 准备或复用有权使用的本地 PNG 素材，填写真实 /src/ 路径；
   更新 scripts/optimize-assets.mjs 的案件列表，执行 npm run assets:optimize，
   确认所有引用都有对应的 WebP。没有素材时说明复用方案，不能填写不存在的路径。
4. 在 src/game/cases.ts 导入并通过 loadCase 注册新案件，加入 unlocked 列表，
   调整待开放占位卡；检查 App.tsx 中的地点文案与报案步骤，
   核对 saves.ts 的报案步数限制和新案件的存档版本。
5. 沿用证据发现/核实的前置规则，以及角色知识隔离、研判来源过滤、
   请求取消和旧响应隔离机制；为新案件补充有意义的规则与裁决测试。
   原有案件应保持可玩。
6. 执行 npm test、npm run lint、npm run build；有桌面环境时验证 Tauri 构建。
   实际走通选案、报案回看、单问/群问/引用、发现并核实证据、存读档、
   裁决与评分。有真实 AI 配置时再验证真实对话；缺少配置时明确说明未验证项。
7. 交付修改文件、进入新案件的方法、证据链与裁决测试结果、素材来源和剩余问题。
   只提交源码、必要素材与公开文档；密钥、本机路径、原始转写和玩家存档留在本地。
```

## 代码结构

| 位置 | 职责 |
| --- | --- |
| `src/App.tsx`、`src/App.css` | 首页、选案、受理、圆桌、卷宗、裁决及设置界面 |
| `src/components/` | 当前发言等可复用 UI |
| `src/game/case-packs/` | 案件 YAML、人物和场景原始素材 |
| `src/game/cases.ts`、`caseSchema.ts` | 手动注册案件、加载素材、校验数据引用与规则 |
| `src/store/gameStore.ts` | 唯一调查状态；阶段、口供、证据、人物和裁决草稿 |
| `src/game/logic.ts`、`investigation.ts` | AI 可见知识、证据规则、评分与问话协调 |
| `src/game/aiClient.ts`、`server/ai.ts` | 双端 AI 传输与本机网页代理 |
| `src/game/engine.ts`、`saves.ts` | Pixi’VN 场景演出与版本化存档 |
| `src-tauri/` | Rust 桌面壳、系统钥匙串及桌面 AI 请求 |
| `shared/`、`scripts/` | 共享 AI 配置、素材处理工具 |
| `docs/`、`.agents/skills/` | 开发与案件编写指南、第三方技能及许可 |

更具体的调用关系与扩展入口见 [开发指南](docs/ARCHITECTURE.md)。

## 开发与贡献

```bash
npm test
npm run lint
npm run build
```

欢迎通过 Issue 讨论玩法或提交 PR，尤其是原创案件、交互改进和可复现的缺陷修复。新案件请附素材来源、完整证据链和裁决测试；玩家自行游玩时应从报案与口供推理出答案。

Git 保留源码、案件、必要素材、配置示例和依赖锁文件；忽略 `.env`、签名文件、构建产物、测试输出、个人存档和本机开发记录。需要公开的安装包与预览图应作为发布附件单独提供。`.gitignore` 作用于未来提交，已经存在于提交历史的文件不会因此消失。

## 许可与第三方来源

本项目原创代码与文档采用 **[MIT License](LICENSE)**。使用和分发时请保留版权与许可声明。

第三方依赖和技能继续遵循各自的许可证，例如 Pixi’VN 1.9.9 使用 LGPL-2.1；Mac 打包配置同时保留本项目 MIT 与 Pixi’VN 许可副本。依赖、技能、现有人物与场景的来源记录见 [第三方说明](docs/THIRD_PARTY.md)。
