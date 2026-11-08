# 上游与素材来源

- 场景引擎：[@drincs/pixi-vn 1.9.9](https://github.com/DRincs-Productions/pixi-vn/releases/tag/v1.9.9)，**LGPL-2.1**（以实际 npm 包 package.json 和 LICENSE 为准）。实际依赖锁定于 package-lock.json，库本身未修改。采用其背景、人物、转场、声音与异步存档 hooks；许可全文见 [PIXI-VN-LICENSE.txt](licenses/PIXI-VN-LICENSE.txt)，应用资源中同时包含副本。对应源码为 [v1.9.9 源码归档](https://github.com/DRincs-Productions/pixi-vn/archive/refs/tags/v1.9.9.tar.gz)。在本项目替换该依赖后，可按 README 中的源码构建命令重新生成应用。
- `.agents/skills/pixi-vn-*`：来自 [Pixi’VN v1.9.9](https://github.com/DRincs-Productions/pixi-vn/tree/v1.9.9/skills)，本项目保留使用到的 SKILL.md；文档内其他技能与链接仍指向上游，不表示全部安装。
- `.agents/skills/game-ui-ux`、`dialogue-systems`、`save-systems`：来自 [GameDev Agent Skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9)，固定调研提交。采用响应式游戏菜单、对话状态和版本化存档原则。
- 现有人物、场景：保留基线仓库原 PNG，在 `src/assets/optimized` 生成相同分辨率的 WebP，保留透明通道。`npm run assets:optimize` 可重建；质量 88、alpha 100，19 张图从 39,809,872 字节缩小至 3,565,716 字节（91.0%）。
- `src/assets/audio/evidence.wav`：本轮程序生成的双频短提示音，无外部录音。
- 界面图标：lucide-react，原有项目依赖；字体使用本机宋体与系统中文字体，无远程字体请求。

技能不参与游戏运行；上游保存文档的同步示例与 1.9.9 类型声明存在出入，本项目以实际异步 API 为准，始终 await 导出与恢复。

## 现有素材的记录范围

现有人物、场景和两案内容沿用原仓库。仓库尚未附齐美术原作者、生成或委托记录，以及案情原始素材的独立许可；本说明只确认已有文件和依赖来源，不将这些内容另行标为 CC0 或其他素材许可。新增案件请记录你提供的素材来源与授权范围。

项目原创代码与文档采用根目录的 [MIT License](../LICENSE)。第三方技能分别保留 [Pixi’VN 许可](../.agents/skills/PIXI-VN-LICENSE) 和 [GameDev Agent Skills 许可](../.agents/skills/GAMEDEV-LICENSE)，第三方内容继续适用其自身声明。
