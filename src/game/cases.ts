import type { CaseDefinition, CaseListItem } from './types'
import chenPortrait from '../assets/cases/missing-lantern-parcel/characters/chen.png'
import linPortrait from '../assets/cases/missing-lantern-parcel/characters/lin.png'
import liuPortrait from '../assets/cases/missing-lantern-parcel/characters/liu.png'
import qiaoPortrait from '../assets/cases/missing-lantern-parcel/characters/qiao.png'
import wuPortrait from '../assets/cases/missing-lantern-parcel/characters/wu.png'
import zhouPortrait from '../assets/cases/missing-lantern-parcel/characters/zhou.png'
import evidenceBoardScene from '../assets/cases/missing-lantern-parcel/scenes/evidence-board.png'
import roundtableScene from '../assets/cases/missing-lantern-parcel/scenes/roundtable-office.png'
import storefrontScene from '../assets/cases/missing-lantern-parcel/scenes/storefront.png'
import verdictDeskScene from '../assets/cases/missing-lantern-parcel/scenes/verdict-desk.png'
import verdictResultScene from '../assets/cases/missing-lantern-parcel/scenes/verdict-result.png'
import clinicLiPortrait from './case-packs/wutong-clinic-gold-ring/assets/characters/li.png'
import clinicLuPortrait from './case-packs/wutong-clinic-gold-ring/assets/characters/lu.png'
import clinicOfficerZhouPortrait from './case-packs/wutong-clinic-gold-ring/assets/characters/officer-zhou.png'
import clinicZhaoPortrait from './case-packs/wutong-clinic-gold-ring/assets/characters/zhao.png'
import clinicZhouGrannyPortrait from './case-packs/wutong-clinic-gold-ring/assets/characters/zhou-granny.png'
import clinicFrontDeskScene from './case-packs/wutong-clinic-gold-ring/assets/scenes/clinic-front-desk.png'
import clinicFrontScene from './case-packs/wutong-clinic-gold-ring/assets/scenes/clinic-front.png'
import clinicRoundtableScene from './case-packs/wutong-clinic-gold-ring/assets/scenes/roundtable-office.png'

export const demoCase: CaseDefinition = {
  id: 'missing-lantern-parcel',
  title: '灯笼巷丢失的蓝色快递',
  incidentSummary:
    '灯笼巷小卖部门口的代收架上，一个蓝色快递盒在晚饭前不见了。盒子里是一台给老人买的血压计，价值不高但街坊都很上火。',
  reportText:
    '小卖部老板娘报案：她傍晚临时去后院搬饮料，回来发现代收架最上层的蓝色快递不见了。当时巷口有四个人来回经过，民警老周已经把相关人员请到圆桌。',
  reporter: {
    name: '刘婶',
    portrait: liuPortrait,
    identity: '灯笼巷小卖部老板娘，街坊快递临时代收点负责人。',
    concern: '快递里是吴师傅给老人买的血压计，东西不贵，但如果说不清楚，代收点以后没人敢放东西。',
    statement:
      '她说18:58左右快递员把蓝色快递盒放到代收架最上层。她去后院搬两箱饮料，19:18回来时发现盒子不见了，其他快递还在。',
  },
  involvedParties: [
    {
      characterId: 'lin',
      relationship: '住在巷尾的年轻人，常从小卖部门口经过，和吴师傅、乔妹都熟。',
      summonsReason: '有人说他19点后在代收架附近出现过，他本人也承认路过小卖部。',
    },
    {
      characterId: 'qiao',
      relationship: '隔壁理发店学徒，门店正对巷口，和林越有私下人情往来。',
      summonsReason: '她19:10左右在理发店门口倒垃圾，可能看见巷尾方向的人影。',
    },
    {
      characterId: 'chen',
      relationship: '住在小卖部对面的老街坊，傍晚常在门口择菜聊天。',
      summonsReason: '她主动说看见有人抱着蓝色盒子往巷尾走，是目前最直接的目击者。',
    },
    {
      characterId: 'wu',
      relationship: '修车铺老板，也是丢失快递的收件人。',
      summonsReason: '快递写着他的名字，他需要说明暂存快递和19点后的去向。',
    },
  ],
  sceneAssets: {
    storefront: storefrontScene,
    roundtable: roundtableScene,
    evidenceBoard: evidenceBoardScene,
    verdictDesk: verdictDeskScene,
    verdictResult: verdictResultScene,
  },
  evidence: [
    {
      id: 'parcel-record',
      title: '快递系统记录',
      stage: 'initial',
      provider: 'police',
      content: '18:58，快递员在系统里确认蓝色快递盒放到小卖部门口代收架最上层。',
    },
    {
      id: 'shelf-condition',
      title: '代收架现场状态',
      stage: 'initial',
      provider: 'police',
      content: '代收架没有撬动痕迹，其他快递没有被翻乱，说明快递大概率是被人直接拿走。',
    },
    {
      id: 'recipient-label',
      title: '快递外侧纸条',
      stage: 'initial',
      provider: 'police',
      content: '小卖部老板娘记得蓝色快递盒外侧贴着“吴师傅收”的纸条，字迹很醒目。',
    },
    {
      id: 'barbershop-reflection',
      title: '理发店玻璃倒影',
      stage: 'unlockable',
      provider: 'ai2_or_police',
      vagueLabel: '证据一',
      discoveryLabel: '巷尾方向的客观记录',
      triggerHint: '当玩家追问19:05到19:10之间谁经过巷尾、谁接触蓝色盒子时，可申请老周核实。',
      content: '隔壁理发店门口的监控没有正拍到代收架，但19:07的玻璃倒影里出现一个抱着蓝色盒子往巷尾走的人影，脸部不清。',
    },
    {
      id: 'tire-scratch',
      title: '修车铺旧轮胎擦痕',
      stage: 'unlockable',
      provider: 'ai2_or_police',
      vagueLabel: '证据二',
      discoveryLabel: '修车铺附近的现场痕迹',
      triggerHint: '当玩家追问快递可能被藏到哪里，或有人提到修车铺附近时，可申请老周查看现场。',
      content: '修车铺旧轮胎后面有一块新鲜纸箱擦痕，旁边有蓝色包装纸屑。',
    },
    {
      id: 'tape-borrow-record',
      title: '修车铺胶带登记',
      stage: 'unlockable',
      provider: 'ai2_or_police',
      vagueLabel: '证据三',
      discoveryLabel: '19点后的借用记录',
      triggerHint: '当玩家追问林越19:05之后去向，或吴师傅提到修车铺补胎时，可申请老周核对登记本。',
      content: '吴师傅修车铺的小登记本显示，19:08有人借过一卷透明胶带，登记名字写的是“林越”。',
    },
  ],
  truthTimeline: [
    '18:50 吴师傅把快递暂存在小卖部门口代收架最上层。',
    '19:02 林越路过小卖部，看见蓝色快递盒上的收件名。',
    '19:05 陈阿姨在店门口看见林越拿着一个蓝色快递盒往巷尾走。',
    '19:08 林越把快递藏到了修车铺旧轮胎后面，打算晚点拿走。',
    '19:10 乔妹看见林越从修车铺出来，猜到他藏了东西，但因为之前欠林越人情选择含糊其辞。',
    '19:18 小卖部老板娘发现快递丢失并报案。',
  ],
  characters: [
    {
      id: 'zhou',
      name: '老周',
      roleType: 'police',
      portrait: zhouPortrait,
      avatar: zhouPortrait,
      emotion: 'calm',
      personality: '稳、慢、讲规矩，不参与推理。',
      publicBackground: '老街片区民警，负责传唤、控场、记录口供。',
      privateFacts: [],
      visibleFacts: ['接到报案后依法把相关人员请到圆桌。'],
      lieStrategy: '不撒谎，但不提供推理意见。',
      speechStyle: '短句、克制、程序化。',
      openingStatement: '人都到齐了。今天只问清楚快递怎么没的，谁也别抢话，问到谁谁说。',
    },
    {
      id: 'lin',
      name: '林越',
      roleType: 'culprit',
      portrait: linPortrait,
      avatar: linPortrait,
      emotion: 'defensive',
      personality: '嘴快、爱面子，怕被街坊看不起，遇到追问会急着解释。',
      publicBackground: '住在巷尾的年轻人，常帮邻居跑腿，也常被说手脚不稳当。',
      privateFacts: ['他拿走了蓝色快递盒。', '他把快递藏到了修车铺旧轮胎后面。'],
      visibleFacts: ['19:02左右路过小卖部门口。', '知道吴师傅最近想买血压计。'],
      lieStrategy: '承认路过，但否认碰过快递；被追问时把注意力引到吴师傅和陈阿姨身上。',
      speechStyle: '语速快，句尾常反问，喜欢说“我犯得着吗”。',
      openingStatement:
        '我就路过买瓶水，连店门都没进去。蓝盒子我好像瞥见过，但我犯得着拿吴师傅的东西吗？',
    },
    {
      id: 'qiao',
      name: '乔妹',
      roleType: 'accomplice',
      portrait: qiaoPortrait,
      avatar: qiaoPortrait,
      emotion: 'evasive',
      personality: '机灵、怕麻烦，习惯把话说得模糊。',
      publicBackground: '理发店学徒，傍晚在门口倒垃圾。',
      privateFacts: ['她看见林越从修车铺方向出来，神色慌张。', '她猜到林越藏了东西，但不想得罪他。'],
      visibleFacts: ['19:10左右在理发店门口倒垃圾。', '看见有人从巷尾经过，但距离有点远。'],
      lieStrategy: '不直接否认见过林越，只说光线暗、没看清、可能记错。',
      speechStyle: '轻飘飘，常用“好像”“可能”“我不敢说”。',
      openingStatement:
        '我那会儿在倒垃圾，天快黑了，只看见有人影从巷尾过去。是不是林越我不敢说，真没看清。',
    },
    {
      id: 'chen',
      name: '陈阿姨',
      roleType: 'witness',
      portrait: chenPortrait,
      avatar: chenPortrait,
      emotion: 'insistent',
      personality: '热心、碎嘴，记性大体可靠但容易夹杂主观判断。',
      publicBackground: '住小卖部对面，傍晚在门口择菜。',
      privateFacts: ['她看见林越拿着蓝色盒子，但没看清盒子上的收件名。'],
      visibleFacts: ['19:05左右在店门口看见林越拿着一个蓝色快递盒。'],
      lieStrategy: '基本说真话，会夸大自己看得很清楚。',
      speechStyle: '话多，爱补充街坊八卦。',
      openingStatement:
        '我看见林越抱着个蓝盒子往巷尾走，颜色我记得清清楚楚。你们别说我多嘴，我眼神还行。',
    },
    {
      id: 'wu',
      name: '吴师傅',
      roleType: 'innocent',
      portrait: wuPortrait,
      avatar: wuPortrait,
      emotion: 'anxious',
      personality: '急脾气、爱较真，但人很直。',
      publicBackground: '修车铺老板，丢失快递的收件人。',
      privateFacts: ['他19:00后一直在修车铺里补胎，没有拿走自己的快递。'],
      visibleFacts: ['18:50把快递暂存在小卖部门口。', '19:00后在修车铺里补胎。'],
      lieStrategy: '不撒谎，但因为着急会打断别人。',
      speechStyle: '直接、硬邦邦，经常强调时间。',
      openingStatement:
        '那盒子是我的，我要拿早拿了。七点之后我一直在铺子里补胎，手上全是胶，没去过代收架。',
    },
  ],
  verdict: {
    culpritId: 'lin',
    accompliceIds: ['qiao'],
    innocentIds: ['chen', 'wu'],
    explanation:
      '林越拿走并藏起快递，乔妹看到关键异常后选择含糊包庇；陈阿姨是关键目击者，吴师傅是失主且无作案必要。',
  },
}

export const wutongClinicCase: CaseDefinition = {
  id: 'wutong-clinic-gold-ring',
  title: '梧桐镇诊所金戒指失踪案',
  incidentSummary:
    '梧桐镇一家小诊所里，医生李教授在给老人患者做理疗前摘下手上的金戒指，暂时放在前台托盘里。几分钟后，一名穿运动服的年轻人闯进诊所与他争执，争执结束后，托盘还在，戒指却不见了。',
  reportText:
    '李教授报案称，他的金戒指是在诊所前台附近短时间内失踪的。当时诊所里只有护士兼助理小卢、老人患者周奶奶，以及追进来争执的年轻人赵晨。周警官把相关人员请到圆桌，要求每个人说明案发前后的行动。',
  reporter: {
    name: '李教授',
    portrait: clinicLiPortrait,
    identity: '梧桐镇小诊所医生，金戒指失主。',
    concern: '戒指是他多年佩戴的旧物，虽然诊所里当时人不多，但每个人都说自己没拿，如果说不清楚，诊所以后也不好继续开门接诊。',
    statement:
      '我给周奶奶做理疗前，怕按摩油沾到戒指，就把戒指摘下来放在前台托盘里。赵晨后来追进来跟我争，我应付完再回头看，托盘还在，戒指没了。',
  },
  involvedParties: [
    {
      characterId: 'lu',
      relationship: '诊所护士兼助理，平时负责前台、接待和理疗准备。',
      summonsReason: '案发时一直在前台附近，最熟悉托盘和柜台位置。',
    },
    {
      characterId: 'zhao',
      relationship: '穿运动服的年轻人，曾因家人就诊问题和李教授有过不愉快。',
      summonsReason: '案发时从门口追进诊所争执，经过前台附近，有接近托盘的机会。',
    },
    {
      characterId: 'zhou-granny',
      relationship: '老人患者，当天来诊所看膝盖。',
      summonsReason: '案发时在诊所内，目睹了李教授摘戒指、小卢嚼口香糖和赵晨争执。',
    },
  ],
  sceneAssets: {
    storefront: clinicFrontScene,
    roundtable: clinicRoundtableScene,
    evidenceBoard: clinicFrontDeskScene,
    verdictDesk: verdictDeskScene,
    verdictResult: verdictResultScene,
  },
  evidence: [
    {
      id: 'li-report',
      title: '李教授的报案陈述',
      stage: 'initial',
      provider: 'police',
      content:
        '李教授称，他在给周奶奶做理疗前把金戒指摘下，放到前台托盘里；赵晨追进诊所争执后，他再回到前台，发现托盘还在，戒指不见了。',
    },
    {
      id: 'tray-condition',
      title: '前台托盘状态',
      stage: 'initial',
      provider: 'police',
      content: '前台托盘没有被拿走，也没有翻倒痕迹，托盘里只少了金戒指。这说明戒指是被人从托盘里单独取走或转移。',
    },
    {
      id: 'granny-initial-statement',
      title: '周奶奶的初始证词',
      stage: 'initial',
      provider: 'police',
      content: '周奶奶记得，小卢在她进诊所时正在前台嚼口香糖；李教授摘戒指后，赵晨从门口追进诊所争执，并经过前台附近。',
    },
    {
      id: 'gum-wrapper',
      title: '垃圾桶里的口香糖包装纸',
      stage: 'unlockable',
      provider: 'ai2_or_police',
      vagueLabel: '证据一',
      discoveryLabel: '前台附近的细小垃圾',
      triggerHint: '当玩家追问小卢案发前后有没有嚼口香糖、口香糖去了哪里，或要求检查前台附近垃圾桶时，可申请周警官核实。',
      content: '诊所角落垃圾桶里只有一张新丢进去不久的口香糖包装纸，没有找到对应的口香糖本体。',
    },
    {
      id: 'gum-under-counter',
      title: '柜台底下的口香糖',
      stage: 'unlockable',
      provider: 'ai2_or_police',
      vagueLabel: '证据二',
      discoveryLabel: '前台柜台底部的异常黏附物',
      triggerHint: '当玩家追问戒指可能被临时藏在哪里、要求检查前台柜台底部，或发现口香糖本体不在垃圾桶里时，可申请周警官查看。',
      content: '前台柜台底下粘着一团被按扁的口香糖，位置隐蔽，站在前台外侧不容易第一时间看到。',
    },
    {
      id: 'ring-in-gum',
      title: '口香糖里的金戒指',
      stage: 'unlockable',
      provider: 'ai2_or_police',
      vagueLabel: '证据三',
      discoveryLabel: '被临时藏住的失物',
      triggerHint: '当玩家已经发现柜台底下的口香糖，并要求进一步取下检查时，可申请周警官处理。',
      content: '周警官戴手套取下柜台底下的口香糖后，发现李教授失踪的金戒指被包在口香糖里，粘在柜台底部。',
    },
  ],
  truthTimeline: [
    '周奶奶来到梧桐镇小诊所看膝盖，进门时看见小卢在前台嚼口香糖。',
    '李教授准备理疗，怕按摩油弄脏戒指，把金戒指摘下放在前台托盘里。',
    '赵晨先在诊所门口与李教授争执，李教授转身回到里面。',
    '赵晨不肯罢休，追进诊所继续争执，并经过前台附近。',
    '众人注意力被争执吸引时，小卢用嘴里的口香糖粘住戒指。',
    '小卢把包着戒指的口香糖按在前台柜台底下，准备等人散了再取走。',
    '小卢把口香糖包装纸丢进诊所角落的垃圾桶。',
    '争执结束后，李教授发现托盘还在，金戒指不见了，于是报案。',
    '周警官检查前台附近，最终从柜台底下的口香糖里找回金戒指。',
  ],
  characters: [
    {
      id: 'officer-zhou',
      name: '周警官',
      roleType: 'police',
      portrait: clinicOfficerZhouPortrait,
      avatar: clinicOfficerZhouPortrait,
      emotion: 'calm',
      personality: '稳重、克制，重视程序和事实。',
      publicBackground: '梧桐镇片区民警，负责把相关人员请到圆桌并维持盘问秩序。',
      privateFacts: [],
      visibleFacts: ['接到李教授报案后，到诊所登记现场情况，并把相关人员请来说明。'],
      lieStrategy: '不撒谎，不替玩家推理，不主动公布答案。',
      speechStyle: '简短、程序化，提醒大家围绕事实说话。',
      openingStatement: '今天只问清楚一件事：戒指什么时候不见的，谁有机会碰到它。每个人按自己看到的说，不要抢话，也不要互相扣帽子。',
    },
    {
      id: 'li',
      name: '李教授',
      roleType: 'innocent',
      portrait: clinicLiPortrait,
      avatar: clinicLiPortrait,
      emotion: 'irritated',
      personality: '好面子、讲排场，遇到质疑时容易急躁。',
      publicBackground: '梧桐镇小诊所医生，平时负责问诊和理疗。',
      privateFacts: ['他没有拿走自己的戒指，也没有把戒指转移到别处。'],
      visibleFacts: ['理疗前把金戒指摘下，放在前台托盘里。', '赵晨追进诊所争执时，他离开理疗床附近去应付对方。', '争执结束后，他发现托盘还在，戒指不见了。'],
      lieStrategy: '不偷戒指，但会回避自己和小卢之间的辞职、工资矛盾。',
      speechStyle: '爱强调自己是失主，说话带点不耐烦。',
      openingStatement: '戒指是我自己摘下来放到前台托盘里的。赵晨一闹，我就被他缠住了。等我再看，托盘还好好在那儿，戒指没了。',
    },
    {
      id: 'lu',
      name: '小卢',
      roleType: 'culprit',
      portrait: clinicLuPortrait,
      avatar: clinicLuPortrait,
      emotion: 'guarded',
      personality: '表面机灵、嘴上客气，心里压着不满，遇到追问会装委屈。',
      publicBackground: '诊所护士兼助理，负责前台接待、理疗准备和杂务。',
      privateFacts: ['她趁赵晨追进来争执时，用嘴里的口香糖粘住戒指。', '她把包着戒指的口香糖按在前台柜台底下，打算等人散了再取走。', '她把口香糖包装纸丢进了诊所角落的垃圾桶。'],
      visibleFacts: ['案发前一直在前台附近。', '周奶奶进诊所时看见她正在嚼口香糖。', '她熟悉前台托盘、柜台和垃圾桶的位置。', '她最近提过想离开诊所，但交接还没谈妥。'],
      lieStrategy: '承认自己在前台，承认嚼过口香糖，但说自己只是吐掉了；把注意力引向有怨气又靠近过前台的赵晨。',
      speechStyle: '语气轻、会喊冤，常说“我就在前台忙自己的”“谁会用这种办法偷东西”。',
      openingStatement: '我一直在前台忙，赵晨闯进来以后大家都在看他。戒指放哪儿、什么时候没的，我真没注意。你们不能因为我离托盘近就怀疑我吧？',
    },
    {
      id: 'zhao',
      name: '赵晨',
      roleType: 'innocent',
      portrait: clinicZhaoPortrait,
      avatar: clinicZhaoPortrait,
      emotion: 'angry',
      personality: '冲动、直来直去，有怨气但不擅长掩饰。',
      publicBackground: '穿运动服的年轻人，曾因家人就诊问题和李教授发生过矛盾。',
      privateFacts: ['他没有拿戒指，也不知道戒指被藏在柜台底下。'],
      visibleFacts: ['先在诊所门口和李教授争执。', '李教授转身回诊所后，他又追进去继续讨说法。', '他争执时经过前台附近，一度拍过或扶过柜台边缘。', '他离开时没有被发现带走戒指。'],
      lieStrategy: '不偷戒指，但因为自己闹事心虚，会避重就轻地淡化自己靠近前台的动作。',
      speechStyle: '句子短、火气重，经常反问。',
      openingStatement: '我是来找李教授说理的，不是来偷东西的。我是进去了，也碰过前台边上，但那是我跟他说话急了，戒指我根本没见着。',
    },
    {
      id: 'zhou-granny',
      name: '周奶奶',
      roleType: 'witness',
      portrait: clinicZhouGrannyPortrait,
      avatar: clinicZhouGrannyPortrait,
      emotion: 'nervous',
      personality: '心细但容易紧张，说话慢，会反复确认自己记得的细节。',
      publicBackground: '梧桐镇老人患者，当天来诊所看膝盖。',
      privateFacts: ['她没有看见谁直接拿走戒指。'],
      visibleFacts: ['进诊所时看见小卢在前台嚼口香糖。', '看见李教授把金戒指摘下来，放到前台托盘里。', '看见赵晨从门口追进来争执，并经过前台附近。', '争执时她的注意力主要被赵晨和李教授吸引。'],
      lieStrategy: '不撒谎，但记忆顺序需要被慢慢追问出来。',
      speechStyle: '老实、慢吞吞，常用“我记得”“好像是这么个顺序”。',
      openingStatement: '我是来做理疗的。李医生摘戒指、小卢嚼口香糖、那个小伙子追进来吵，这些我都看见了。可真要说谁拿了戒指，我没亲眼看见。',
    },
  ],
  verdict: {
    culpritId: 'lu',
    accompliceIds: [],
    innocentIds: ['li', 'zhao', 'zhou-granny'],
    explanation:
      '小卢利用赵晨追进诊所争执造成的混乱，用自己正在嚼的口香糖粘住李教授放在前台托盘里的金戒指，并把它藏在柜台底下，准备之后取走。李教授是失主；赵晨有怨气和接近机会，但没有口香糖证据链，也不符合这种临时藏匿方式；周奶奶只是目击者。',
  },
}

export function getPlayableCharacters(caseDefinition: CaseDefinition) {
  return caseDefinition.characters.filter((character) => character.roleType !== 'police')
}

export function getPoliceCharacter(caseDefinition: CaseDefinition) {
  return caseDefinition.characters.find((character) => character.roleType === 'police')
}

export const playableCharacters = getPlayableCharacters(demoCase)

export const caseList: CaseListItem[] = [
  {
    id: demoCase.id,
    title: demoCase.title,
    difficulty: 1,
    status: 'unlocked',
    summary: '生活纠纷 / 小额快递失踪 / 预计短局',
    tags: ['已解锁', '生活纠纷', '短局'],
    caseDefinition: demoCase,
  },
  {
    id: wutongClinicCase.id,
    title: wutongClinicCase.title,
    difficulty: 2,
    status: 'unlocked',
    summary: '诊所纠纷 / 金戒指失踪 / 预计短局',
    tags: ['已解锁', '生活纠纷', '误导嫌疑'],
    caseDefinition: wutongClinicCase,
  },
  {
    id: 'case-3',
    title: '案件三',
    difficulty: 3,
    status: 'locked',
    summary: '后续开放',
    tags: ['未解锁'],
  },
  {
    id: 'case-4',
    title: '案件四',
    difficulty: 4,
    status: 'locked',
    summary: '后续开放',
    tags: ['未解锁'],
  },
  {
    id: 'case-5',
    title: '案件五',
    difficulty: 5,
    status: 'locked',
    summary: '后续开放',
    tags: ['未解锁'],
  },
]

export function getCaseDefinition(caseId: string): CaseDefinition {
  return caseList.find((item) => item.id === caseId)?.caseDefinition || demoCase
}
