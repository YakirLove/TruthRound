# 开发指南与代码地图

本项目使用 React + TypeScript + Vite、Zustand、Pixi’VN 1.9.9 和 Tauri 2。优先从实际源码与测试理解行为；本文说明模块边界和容易遗漏的扩展位置。

## 一次调查如何运行

1. `src/game/cases.ts` 显式导入案件 YAML，由 `caseSchema.ts` 校验，再将逻辑 PNG 路径映射到已优化的 WebP URL。
2. `src/store/gameStore.ts` 创建 `InvestigationSession`，作为当前调查的唯一状态来源。React 显示报案、口供、证据与裁决；`engine.ts` 按阶段、案件和人物更新场景。
3. 玩家发问后，`investigation.ts` 为本轮问话建立请求，依次协调角色回复和证据触发检测，维护已完成、失败和可重试状态。
4. `logic.ts` 为角色、札记、证据检测分别构造最小输入。`aiClient.ts` 在网页端调用本机 HTTP 代理，在桌面端调用 Tauri 命令。
5. 角色回答追加到口供。AI 返回的证据 ID 只是候选，调查规则检查发现阶段和已核实前置证据，之后玩家才能请民警核实。
6. `saves.ts` 监听有效状态变化，以队列写入 IndexedDB。`engine.ts` 的异步导出 hooks 纳入调查快照，恢复前检查存档与案件版本，恢复后重建场景。
7. 所有人物归类后，`logic.ts` 根据案件的裁决答案评分。结案页才展示完整真相。

## 数据与知识边界

- 案件内容：`CasePackage` / `CaseDefinition`，实际结构由 `src/game/caseSchema.ts` 定义。
- 当前进度：`InvestigationSession`，涵盖阶段、口供、证据状态、人物选择、引用、裁决草稿和报案步骤。
- 玩家已知信息：`PlayerKnowledge`，从当前已展示口供与已核实证据生成。
- AI 传输：`AITransport`，负责请求、取消和超时；传输失败显示操作提示。
- 存档：`SaveEnvelope`，记录格式版本、游戏版本、案件版本、时间与 Pixi’VN/调查快照。

公开报案、人物开场陈述与证据发现提示必须由案件作者控制信息量。完整真相和其他人物的私密事实不进入角色请求；完整真相、角色身份和隐藏证据不进入札记请求。札记按允许的来源 ID 重建展示文本，模型自由推断不进入札记。

开源仓库和客户端资源都包含案件答案。这里的防剧透约束针对正常游玩和 AI 请求，不是对阅读源码的玩家隐藏源码。

## AI 与密钥

- 网页：Vite 开发和预览插件加载 `.env`，`server/ai.ts` 提供 `GET /api/health` 与 `POST /api/ai`，仅接受本机来源。
- 桌面：`src-tauri/src/lib.rs` 提供 AI 请求、取消、配置状态和钥匙串写入。macOS 密钥保存在系统钥匙串；开发构建还可读取项目 `.env`。
- 配置：`shared/ai-presets.json` 是双端模型和系统提示词的共同来源。
- 请求：前端请求包含会话/请求标识，状态协调层在切案、读档或重开后丢弃旧结果。群问只重试未完成的人物。

密钥没有 `VITE_` 前缀；前端构建、存档和接口错误信息都不应包含密钥。

## 新案件的接入位置

当前没有自动发现、游戏内编辑器或外部案件热加载。添加案件需要同步维护：

| 位置 | 何时改 |
| --- | --- |
| `src/game/case-packs/<id>/case.yaml` | 新增案件内容 |
| `src/game/cases.ts` | 导入新 YAML、调用 `loadCase`、加入可玩列表并调整占位卡 |
| `scripts/optimize-assets.mjs` | 将新 ID 加入脚本中的案件数组，生成引用素材的 WebP |
| `src/App.tsx` | 当前圆桌地点在两案间硬编码，需要补充新地点；报案步骤按内容动态生成 |
| `src/game/saves.ts` | 报案步骤当前最大索引为 10；更长案件需同步调整并测试 |
| `src/game/*.test.ts` | 新案件的规则、评分、知识过滤与存档验证 |

人物注册、Pixi 资源 bundle 和存档案件查找都基于案件列表。正确注册后一般不必为每个案件修改引擎或 AI 代理。详见 [新增案件指南](ADDING_CASES.md)。

## 素材与仓库文件

YAML 使用 `/src/` 开头的 PNG 逻辑路径，优化脚本生成 `src/assets/optimized/` 下对应的 WebP；游戏加载这些 WebP。原 PNG 与优化图都是公开源码的一部分，便于复现素材构建。签名文件、`.env`、玩家存档、构建缓存与原始转写不属于游戏源码。

`src/store/interfaceLogStore.ts` 是保留的开发日志工具及其测试，当前主盘问调用链未接入该工具。若重新使用，继续保留脱敏与仅开发环境启用的限制。

## 验证建议

纯文档改动检查命令、链接与路径即可。案件数据改动应验证 schema、人物/证据引用、发现与核实顺序、正确及错误裁决，并实际试玩；新增图片运行素材优化和前端构建。修改请求协调或存档协议时，覆盖取消、旧请求隔离、群问部分失败与坏档恢复。

基础命令见 README。修改 Rust 后追加 `cargo check --locked`；交付 Mac 应用使用 README 的 Tauri 构建命令。
