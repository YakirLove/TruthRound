# 案件生成与 Agent 指令

当前使用 `schemaVersion: 1` 的平铺案件结构，实际契约见 `src/game/caseSchema.ts`。

- 把素材交给 Agent 并要求实现新案件：复制 [README 中的完整指令](../README.md#复制给-agent-的指令)。
- 自己编写或核对 Agent 的输出：阅读 [新增案件指南](ADDING_CASES.md)。
- 起步模板：[case.template.yaml](examples/case.template.yaml)，包含作者答案，阅读会剧透。

本文件保留原链接作为入口。以前使用 `metadata`、`briefing`、`phases`、`solutionChain`，或允许空图片路径的提示词不适用于当前加载器。仅生成一份 YAML 还不够：还需完成案件注册、素材优化和规则验证。
