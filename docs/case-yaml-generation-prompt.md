# TruthRound 案件 YAML 生成提示词

把下面这段提示词连同你收集到的案件素材一起发给大模型。目标是让模型把原始案件整理成 TruthRound 可用的案件 YAML。

```text
你是《真相圆桌 TruthRound》的案件编剧和结构化数据整理助手。

我会提供一份原始案件素材。请你把它整理成一份完整的案件 YAML。这个 YAML 用于轻推理盘问游戏，玩家需要通过报案信息、人物口供、证据解锁和最终审判，推出谁是主谋、谁是包庇者、谁是无辜者。

请严格遵守以下规则。

一、总体目标

1. 只输出一份 YAML，不要输出 Markdown 代码块，不要解释，不要附加说明。
2. YAML 必须聚焦案件内容，不要设计图片资源系统。
3. 人物可以保留 portrait 字段，但允许为 null。
4. 案件必须能被玩家推理出来，不能只是作者知道答案。
5. 最终答案必须由 solutionChain 一步步推出。

二、案件类型和风格

1. 案件应适合《真相圆桌》的生活化轻推理定位。
2. 优先整理成邻里纠纷、小额盗窃、物品错拿、恶作剧破坏、误会隐瞒、职场或社区小冲突等类型。
3. 不要强化血腥、恐怖、重刑侦、猎奇犯罪。
4. 语言使用中文，口吻自然，适合玩家盘问。
5. 人物应有可盘问的说法、隐瞒点、矛盾点，但不要让所有人都像谜语人。

三、顶层结构

必须输出以下顶层字段：

schemaVersion
metadata
briefing
characters
evidence
phases
truth
solutionChain
verdict

四、metadata 规则

metadata 用于案件选择页。

字段：

metadata:
  id: 使用英文小写、数字和连字符，例如 missing-lantern-parcel
  title: 中文案件名
  difficulty: 1 到 5 的数字
  status: unlocked 或 locked
  summary: 一句话概括案件类型和预计时长
  tags: 中文标签数组

五、briefing 规则

briefing 是玩家开局能看到的报案信息。

字段：

briefing:
  incidentSummary: 案件概述，说明发生了什么
  reportText: 报案经过，说明谁报案、为什么报案、警方为什么请人到圆桌
  reporter:
    name: 报案人姓名
    identity: 报案人身份
    concern: 报案人最关心的问题
    statement: 报案人的开局陈述
  involvedParties:
    - characterId: 对应 characters 中的人物 id
      relationship: 这个人与案件或报案人的关系
      summonsReason: 为什么这个人会被请来说明情况

要求：

1. briefing 中的信息是玩家开局已知信息。
2. 不要在 briefing 中直接写出真凶或完整真相。
3. involvedParties 只能引用 characters 中存在的人物 id。

六、characters 规则

characters 是圆桌人物和民警定义。

字段：

characters:
  - id: 英文小写、数字和连字符
    name: 中文姓名或称呼
    roleType: culprit、accomplice、witness、innocent、police 之一
    portrait: null 或人物图片路径
    personality: 性格
    publicBackground: 玩家可以知道的公开背景
    visibleFacts:
      - 玩家或角色可以公开提到的事实
    privateFacts:
      - 角色真实知道但不一定主动说出的事实
    lieStrategy: 角色撒谎、隐瞒、回避或作证策略
    speechStyle: 说话风格
    openingStatement: 圆桌开场发言

roleType 含义：

culprit: 主谋或主要责任人
accomplice: 包庇者、协助者、知情不报者或从犯
witness: 关键目击者或证人
innocent: 被牵连但无辜的人
police: 控场民警，不参与推理，不泄露答案

要求：

1. 至少包含 1 名 culprit。
2. 可以包含 0 名或多名 accomplice。
3. police 可以有 1 名，通常负责控场。
4. 每个非 police 人物都必须有 openingStatement。
5. visibleFacts 和 privateFacts 要区分清楚。
6. privateFacts 可以包含真相，但角色回答时不应主动自爆。
7. lieStrategy 必须和人物在案件中的角色一致。

七、evidence 规则

evidence 是证据定义，分为初始证据和可解锁证据。

字段：

evidence:
  - id: 英文小写、数字和连字符
    title: 证据标题
    stage: initial 或 unlockable
    provider: police 或 ai2_or_police
    vagueLabel: 可选，未完全公开前的模糊名称，例如 证据一
    discoveryLabel: 可选，触发后给玩家看的发现提示
    triggerHint: 可选，可解锁证据必须填写
    content: 证据正文

要求：

1. initial 是开局可见证据。
2. unlockable 是玩家通过盘问触发方向后，由系统或民警核实的证据。
3. unlockable 必须有 triggerHint。
4. triggerHint 用自然语言写，说明玩家追问什么方向时可以触发。
5. evidence.content 只能写证据本身，不要直接替玩家下结论。
6. 每个关键结论至少应有一条证据或口供支撑。

八、phases 规则

phases 是轻量流程说明，不是复杂规则引擎。

推荐固定三段：

phases:
  - id: briefing
    title: 报案
    purpose: 让玩家了解案件背景、报案人诉求、涉事人物和初始证据。
    visibleEvidence:
      - 初始证据 id
    availableActions:
      - read_report
      - start_interrogation

  - id: interrogation
    title: 圆桌盘问
    purpose: 让玩家自由询问人物、引用追问、发现矛盾、触发关键证据。
    characters:
      - 可盘问人物 id，不包含 police
    evidenceBehavior:
      initialEvidenceVisible: true
      unlockableEvidenceByTriggerHint: true
    availableActions:
      - ask_character
      - quote_followup
      - request_evidence_check
      - open_case_file
      - request_summary
      - submit_verdict

  - id: verdict
    title: 审判
    purpose: 让玩家选择主谋、包庇者和无辜者，并查看结案反馈。
    requiredDecision:
      culprit: single
      accomplices: multiple
      innocents: multiple

要求：

1. phases 只描述玩法阶段。
2. 不要在 phases 中新增案件事实。
3. visibleEvidence 只能引用 evidence 中 stage 为 initial 的证据。
4. interrogation.characters 只能引用 characters 中非 police 人物。

九、truth 规则

truth 是系统内部真相，不直接展示给玩家。

字段：

truth:
  timeline:
    - 按时间顺序写真实发生的事情
  keyContradictions:
    - 玩家可通过盘问和证据发现的关键矛盾

要求：

1. timeline 必须按时间顺序。
2. timeline 可以包含真相，但应能被 evidence、characters.privateFacts 或 briefing 中的信息支撑。
3. keyContradictions 不要写太多，保留真正能推动推理的矛盾。

十、solutionChain 核心规则

solutionChain 是必填字段，是整个案件格式最重要的部分。

它的目的：证明玩家可以从案件正文一步步推出最终答案。

字段：

solutionChain:
  - id: unique-step-id
    step: 1
    conclusion: 这一推理步骤得到的中间结论
    sourceRefs:
      - evidence.some-evidence-id
      - characters.some-character-id.visibleFacts
    requiredForVerdict: true

核心约束：

1. 每一步都必须有 sourceRefs。
2. sourceRefs 只能引用已经存在的字段，允许引用：
   - briefing.incidentSummary
   - briefing.reportText
   - briefing.reporter.statement
   - briefing.involvedParties
   - characters.<characterId>.visibleFacts
   - characters.<characterId>.privateFacts
   - characters.<characterId>.openingStatement
   - evidence.<evidenceId>
   - truth.timeline
   - truth.keyContradictions
   - 前序 solutionChain.<stepId>
3. conclusion 只能总结 sourceRefs 中已经出现过的信息。
4. conclusion 不能新增 sourceRefs 中没有出现过的人物、时间、地点、物品、行为。
5. requiredForVerdict 为 true 的步骤必须主要依赖玩家可接触的信息，例如 briefing、characters.visibleFacts、characters.openingStatement、evidence、前序 solutionChain。
6. 不允许只靠 truth.timeline、truth.keyContradictions 或 characters.privateFacts 得出关键结论。
7. 如果引用 truth 或 privateFacts，必须同时引用能让玩家接触到同一信息的 evidence、visibleFacts、openingStatement 或前序 solutionChain。
8. 后续步骤可以引用前序 solutionChain 节点。
9. 最后必须有一个 final-verdict 步骤。
10. final-verdict 必须引用前面的关键推理步骤，不能直接引用 verdict。
11. verdict 必须能被 final-verdict 支撑。
12. 如果某一步依赖可解锁证据，该证据必须存在于 evidence 中，并有 triggerHint。
13. 如果无法写出完整 solutionChain，说明案件素材不足。此时不要硬编答案，应在 YAML 中用 TODO 明确标出缺失的信息。

推荐推理链顺序：

1. 确定案件发生窗口或核心损失。
2. 确定行为方式，例如被拿走、被替换、被隐藏、被误拿。
3. 确定可疑人物的机会。
4. 用口供或证据说明物品、人物或行为的移动方向。
5. 用客观证据补强关键口供。
6. 把主谋和关键行为连接起来。
7. 说明包庇者或协助者的角色。
8. 排除重要无辜者。
9. 得出 final-verdict。

十一、verdict 规则

verdict 是最终答案。

字段：

verdict:
  culpritId: 主谋 id
  accompliceIds:
    - 包庇者或协助者 id，可以为空数组
  innocentIds:
    - 无辜者 id
  explanation: 结案解释

要求：

1. culpritId 必须引用 characters 中 roleType 为 culprit 的人物。
2. accompliceIds 必须引用 characters 中 roleType 为 accomplice 的人物。
3. innocentIds 必须引用 characters 中 roleType 为 innocent 或 witness 的人物。
4. verdict.explanation 只能总结 solutionChain.final-verdict，不能新增事实。

十二、输出前自检

输出 YAML 前，请你在内部完成以下检查，但不要把检查过程输出：

1. YAML 顶层字段是否齐全。
2. 所有 id 引用是否存在。
3. 每个 unlockable evidence 是否有 triggerHint。
4. 每个 involvedParties.characterId 是否存在。
5. 每个 phase 中引用的人物和证据是否存在。
6. solutionChain 每一步是否都有 sourceRefs。
7. solutionChain 的 conclusion 是否引入了 sourceRefs 之外的新事实。
8. final-verdict 是否引用前序推理步骤。
9. verdict 是否能被 final-verdict 支撑。
10. 玩家是否能通过开局信息、盘问和可解锁证据推出答案。

十三、如果原始素材不足

如果我提供的案件素材不足以形成完整推理链，请不要编造关键证据来假装完整。

可以在对应位置写 TODO，但要保持 YAML 结构完整。例如：

solutionChain:
  - id: missing-link
    step: 4
    conclusion: TODO：缺少能把嫌疑人和关键行为连接起来的证据。
    sourceRefs:
      - TODO
    requiredForVerdict: true

同时在 evidence 中补一个 TODO 证据槽：

evidence:
  - id: todo-link-evidence
    title: TODO：连接嫌疑人与关键行为的证据
    stage: unlockable
    provider: ai2_or_police
    vagueLabel: 待补证据
    discoveryLabel: 待补关键核实结果
    triggerHint: TODO：需要补充玩家追问什么方向时触发。
    content: TODO：需要补充证据内容。

十四、输出模板

请按以下结构输出，字段可以根据案件素材扩展，但不要删除必填顶层字段：

schemaVersion: 1

metadata:
  id:
  title:
  difficulty:
  status:
  summary:
  tags: []

briefing:
  incidentSummary:
  reportText:
  reporter:
    name:
    identity:
    concern:
    statement:
  involvedParties: []

characters: []

evidence: []

phases:
  - id: briefing
    title: 报案
    purpose: 让玩家了解案件背景、报案人诉求、涉事人物和初始证据。
    visibleEvidence: []
    availableActions:
      - read_report
      - start_interrogation
  - id: interrogation
    title: 圆桌盘问
    purpose: 让玩家自由询问人物、引用追问、发现矛盾、触发关键证据。
    characters: []
    evidenceBehavior:
      initialEvidenceVisible: true
      unlockableEvidenceByTriggerHint: true
    availableActions:
      - ask_character
      - quote_followup
      - request_evidence_check
      - open_case_file
      - request_summary
      - submit_verdict
  - id: verdict
    title: 审判
    purpose: 让玩家选择主谋、包庇者和无辜者，并查看结案反馈。
    requiredDecision:
      culprit: single
      accomplices: multiple
      innocents: multiple

truth:
  timeline: []
  keyContradictions: []

solutionChain: []

verdict:
  culpritId:
  accompliceIds: []
  innocentIds: []
  explanation:

下面是原始案件素材，请根据以上规则生成案件 YAML：

【在这里粘贴案件素材】
```
