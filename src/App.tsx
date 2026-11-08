import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  FileDown,
  FileUp,
  FolderOpen,
  LoaderCircle,
  MessageCircle,
  Pause,
  Quote,
  Save,
  Settings,
  ShieldQuestion,
  Volume2,
  X,
} from 'lucide-react'
import {
  caseList,
  getCaseDefinition,
  getPlayableCharacters,
} from './game/cases'
import { useGameStore } from './store/gameStore'
import { useSettingsStore } from './store/settingsStore'
import {
  useRequestStore,
  runInvestigation,
  cancelInvestigation,
} from './game/investigation'
import { drawScene, initEngine, playEvidenceSound } from './game/engine'
import {
  exportSave,
  listSaves,
  listCaseProgress,
  type CaseProgress,
  loadSave,
  saveSlot,
  startAutosave,
  useSaveStatus,
  type SaveEnvelope,
} from './game/saves'
import {
  connectionStatus,
  isTauriRuntime,
  saveConnection,
} from './game/aiClient'
import {
  buildPlayerVerdictFromRoles,
  isVerdictComplete,
  verdictRoleOptions,
  type VerdictAssignment,
} from './game/verdict'
import { buildPlayerKnowledge } from './game/logic'
import Speech from './components/Speech'
import './App.css'

function Modal({
  title,
  close,
  children,
}: {
  title: string
  close: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
    const dialog = ref.current
    return () => dialog?.close()
  }, [])
  return (
    <dialog ref={ref} onCancel={close} className="modal">
      <header>
        <div>
          <span className="eyebrow">真相圆桌 · 事务所</span>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" onClick={close} aria-label="关闭">
          <X />
        </button>
      </header>
      {children}
    </dialog>
  )
}
function SettingsPanel() {
  const settings = useSettingsStore(),
    [key, setKey] = useState(''),
    [message, setMessage] = useState('正在检查连接配置…'),
    [working, setWorking] = useState(false)
  useEffect(() => {
    void connectionStatus()
      .then((s) =>
        setMessage(s.configured ? 'DeepSeek 已配置' : '尚未配置 AI 连接'),
      )
      .catch(() => setMessage('无法连接本地服务'))
  }, [])
  const save = async () => {
    setWorking(true)
    try {
      await saveConnection(key)
      setKey('')
      setMessage('密钥已保存至系统钥匙串')
    } catch (e) {
      setMessage(String(e))
    } finally {
      setWorking(false)
    }
  }
  return (
    <div className="settings-body">
      <label>
        阅读字号 <b>{settings.fontSize}px</b>
        <input
          aria-label="阅读字号"
          type="range"
          min="15"
          max="22"
          value={settings.fontSize}
          onChange={(e) =>
            useSettingsStore.setState({ fontSize: +e.target.value })
          }
        />
      </label>
      <label>
        文字显示速度{' '}
        <b>
          {settings.textSpeed === 0
            ? '立即显示'
            : settings.textSpeed + ' 字 / 秒'}
        </b>
        <input
          aria-label="文字显示速度"
          type="range"
          min="0"
          max="80"
          step="5"
          value={settings.textSpeed}
          onChange={(e) =>
            useSettingsStore.setState({ textSpeed: +e.target.value })
          }
        />
      </label>
      <label>
        提示音音量 <b>{Math.round(settings.volume * 100)}%</b>
        <input
          aria-label="提示音音量"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.volume}
          onChange={(e) =>
            useSettingsStore.setState({ volume: +e.target.value })
          }
        />
      </label>
      <label className="toggle">
        <span>
          <Volume2 size={17} /> 静音
        </span>
        <input
          type="checkbox"
          checked={settings.muted}
          onChange={(e) =>
            useSettingsStore.setState({ muted: e.target.checked })
          }
        />
      </label>
      <label className="toggle">
        <span>减少动画</span>
        <input
          type="checkbox"
          checked={settings.reduceMotion}
          onChange={(e) =>
            useSettingsStore.setState({ reduceMotion: e.target.checked })
          }
        />
      </label>
      <section className="connection">
        <h3>AI 连接</h3>
        <p role="status">{message}</p>
        {isTauriRuntime() ? (
          <>
            <label>
              DeepSeek API Key
              <input
                autoComplete="off"
                type="password"
                placeholder="填写密钥，保存在系统钥匙串"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </label>
            <button
              disabled={!key.trim() || working}
              onClick={() => void save()}
            >
              保存连接
            </button>
          </>
        ) : (
          <p className="muted">
            本地网页读取项目 .env 中的 DEEPSEEK_API_KEY。修改后重启网页服务。
          </p>
        )}
        <button
          className="text-button"
          onClick={() => {
            setMessage('正在检查…')
            void connectionStatus()
              .then((s) =>
                setMessage(
                  s.configured
                    ? 'DeepSeek 已配置，可开始调查'
                    : '尚未配置 AI 连接',
                ),
              )
              .catch(() => setMessage('本地服务不可用'))
          }}
        >
          重新检查配置
        </button>
      </section>
    </div>
  )
}
function SavePanel({ close }: { close: () => void }) {
  const [slots, setSlots] = useState<(SaveEnvelope | undefined)[]>([]),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  const phase = useGameStore((s) => s.phase)
  useEffect(() => {
    void listSaves()
      .then(setSlots)
      .catch(() => setMessage('无法读取存档'))
  }, [])
  const work = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setMessage('')
    try {
      await action()
      setSlots(await listSaves())
    } catch (e) {
      setMessage(
        e instanceof SyntaxError
          ? '无法读取存档文件，请选择游戏导出的 JSON 存档。当前进度未改变。'
          : e instanceof Error
            ? e.message
            : '存档操作失败',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="save-body">
      <p className="muted">
        自动保存调查进度。手动存档可导出，在本地网页和桌面端之间导入。
      </p>
      {[0, 1, 2, 3].map((id) => (
        <article className="save-slot" key={id}>
          <div className="slot-number">{id === 0 ? '自' : '0' + id}</div>
          <div>
            <h3>{id === 0 ? '自动存档' : '手动存档 ' + id}</h3>
            <p>
              {slots[id]
                ? getCaseDefinition(slots[id]!.caseId).title
                : '尚无存档'}
            </p>
            <small>
              {slots[id]
                ? new Date(slots[id]!.savedAt).toLocaleString('zh-CN')
                : '留下一页调查记录'}
            </small>
          </div>
          <div className="slot-actions">
            {id > 0 && (
              <button
                disabled={busy || ['home', 'case_select'].includes(phase)}
                onClick={() =>
                  void work(async () => {
                    await saveSlot(id)
                    setMessage('存档已保存')
                  })
                }
              >
                保存
              </button>
            )}
            <button
              disabled={busy || !slots[id]}
              onClick={() =>
                void work(async () => {
                  await loadSave(slots[id])
                  close()
                })
              }
            >
              读取
            </button>
            <button
              className="icon-button"
              title="导出存档"
              aria-label={'导出档位 ' + id}
              disabled={busy || !slots[id]}
              onClick={() => slots[id] && exportSave(slots[id]!)}
            >
              <FileDown size={18} />
            </button>
          </div>
        </article>
      ))}
      <label className="import-button">
        <FileUp size={18} /> 导入存档
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file)
              void work(async () => {
                if (file.size > 5_000_000) throw new Error('存档文件过大')
                await loadSave(JSON.parse(await file.text()))
                close()
              })
          }}
        />
      </label>
      <p className="form-message" role="status">
        {message}
      </p>
    </div>
  )
}
function Dossier({
  tab,
  setTab,
}: {
  tab: string
  setTab: (tab: string) => void
}) {
  const state = useGameStore(),
    c = getCaseDefinition(state.currentCaseId),
    req = useRequestStore()
  const knowledge = buildPlayerKnowledge({
    caseDefinition: c,
    conversationHistory: state.turns,
    revealedEvidenceIds: state.revealedEvidenceIds,
  })
  const speaker = (id: string) =>
    id === 'player'
      ? '你 · 侦探'
      : c.characters.find((p) => p.id === id)?.name || '札记'
  return (
    <>
      <header className="dossier-heading">
        <span className="eyebrow">调查卷宗</span>
        <BookOpen size={22} />
      </header>
      <nav className="tabs" aria-label="卷宗分类">
        {[
          ['history', '历史口供'],
          ['evidence', '证据'],
          ['notes', '侦探札记'],
        ].map(([id, name]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {name}
            {id === 'evidence' && (
              <small>
                {state.revealedEvidenceIds.length}/{c.evidence.length}
              </small>
            )}
          </button>
        ))}
      </nav>
      <div className="dossier-scroll">
        {tab === 'history' && (
          <>
            <div className="folio-intro">
              <span>口供录 · 按问话顺序</span>
              <small>人物陈述，有待交叉核实</small>
            </div>
            {state.turns
              .filter((t) => t.turnType !== 'ai2_summary')
              .map((turn, index) => (
                <article
                  className={
                    'transcript ' +
                    (turn.speakerId === 'player' ? 'player' : '')
                  }
                  key={turn.id}
                >
                  <div>
                    <strong>{speaker(turn.speakerId)}</strong>
                    <span>#{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  {turn.quotedExcerpt && (
                    <blockquote>
                      {speaker(turn.quotedExcerpt.speakerId)}：
                      {turn.quotedExcerpt.content}
                    </blockquote>
                  )}
                  <p>{turn.content}</p>
                  {turn.speakerId !== 'player' && (
                    <button
                      className="quote-button"
                      onClick={() => {
                        state.selectQuote(turn.id)
                        if (
                          getPlayableCharacters(c).some(
                            (p) => p.id === turn.speakerId,
                          )
                        )
                          state.setActiveCharacter(turn.speakerId)
                      }}
                    >
                      <Quote size={13} /> 引用追问
                    </button>
                  )}
                </article>
              ))}
          </>
        )}
        {tab === 'evidence' && (
          <>
            <div className="folio-intro">
              <span>物证与核查记录</span>
              <small>盘问发现方向，再请民警核实</small>
            </div>
            {c.evidence.map((e, i) => {
              const revealed = state.revealedEvidenceIds.includes(e.id),
                found = state.discoveredEvidenceIds.includes(e.id)
              return (
                <article
                  className={
                    'evidence-card ' +
                    (revealed ? 'verified' : found ? 'found' : 'hidden')
                  }
                  key={`${e.id}:${revealed ? 'verified' : found ? 'found' : 'hidden'}`}
                >
                  <div className="evidence-meta">
                    <span>证物 {String(i + 1).padStart(2, '0')}</span>
                    <span>
                      {revealed ? '已核实' : found ? '待核实' : '未发现'}
                    </span>
                  </div>
                  <h3>
                    {revealed
                      ? e.title
                      : found
                        ? e.discoveryLabel || e.vagueLabel
                        : e.vagueLabel || '尚待发现的线索'}
                  </h3>
                  <p>
                    {revealed
                      ? e.content
                      : found
                        ? '已有可供追查的方向，请民警核实后入档。'
                        : '继续盘问相关的人、地点和物品。'}
                  </p>
                  {found && !revealed && (
                    <button
                      disabled={req.busy}
                      onClick={() => {
                        state.revealEvidence(e.id)
                        void playEvidenceSound().catch(() => {})
                      }}
                    >
                      <CheckCircle2 size={16} /> 请民警核实
                    </button>
                  )}
                  {revealed && <Check className="verified-mark" size={34} />}
                </article>
              )
            })}
          </>
        )}
        {tab === 'notes' && (
          <>
            <div className="folio-intro">
              <span>依据已知信息整理</span>
              <small>陈述 ≠ 事实；疑点仍需确认</small>
            </div>
            <button
              className="primary full"
              disabled={req.busy}
              onClick={() => void runInvestigation('summary')}
            >
              <ShieldQuestion size={17} />
              {state.latestStructuredSummary ? '更新研判' : '生成研判'}
            </button>
            {!state.latestStructuredSummary && (
              <div className="empty-note">
                <BookOpen size={34} />
                <p>
                  把零散的口供，
                  <br />
                  整理成下一步的问题。
                </p>
              </div>
            )}
            {state.latestStructuredSummary &&
              (
                [
                  ['timeline', '已知时间线'],
                  ['contradictions', '陈述中的矛盾'],
                  ['suspicions', '待确认疑点'],
                  ['clueGaps', '继续调查方向'],
                ] as const
              ).map(([key, title]) => (
                <section className="note-section" key={key}>
                  <h3>{title}</h3>
                  {state.latestStructuredSummary![key].length ? (
                    state.latestStructuredSummary![key].map((line, i) => (
                      <div key={i}>
                        <p>{line}</p>
                        <details>
                          <summary>查看来源</summary>
                          {state.latestStructuredSummary!.sources?.[
                            key + ':' + i
                          ]?.map((id) => {
                            const source = knowledge.sources.find(
                              (s) => s.id === id,
                            )
                            return (
                              <blockquote key={id}>
                                <b>
                                  {source?.kind === 'evidence'
                                    ? '已核实事实'
                                    : source?.kind === 'question'
                                      ? '侦探提问'
                                      : '人物陈述'}{' '}
                                  · {source?.speaker}
                                </b>
                                <p>{source?.content}</p>
                              </blockquote>
                            )
                          })}
                        </details>
                      </div>
                    ))
                  ) : (
                    <p className="muted">暂无足够信息。</p>
                  )}
                </section>
              ))}
          </>
        )}
      </div>
      <footer className="dossier-footer">
        <span>判断留给你，证据留在卷宗里。</span>
      </footer>
    </>
  )
}
export default function App() {
  const state = useGameStore(),
    settings = useSettingsStore(),
    req = useRequestStore(),
    saveStatus = useSaveStatus()
  const c = getCaseDefinition(state.currentCaseId),
    cast = getPlayableCharacters(c)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState<Record<string, CaseProgress>>({})
  const [engineReady, setEngineReady] = useState(false),
    [engineError, setEngineError] = useState(''),
    [modal, setModal] = useState<'settings' | 'saves' | null>(null)
  const [tab, setTab] = useState('history'),
    [folioOpen, setFolioOpen] = useState(false),
    [autoSave, setAutoSave] = useState<SaveEnvelope>(),
    [notice, setNotice] = useState(''),
    [selectedCard, setSelectedCard] = useState('')
  useEffect(() => {
    if (canvasRef.current)
      void initEngine(canvasRef.current)
        .then(() => {
          setEngineReady(true)
          startAutosave()
        })
        .catch((e) => setEngineError(String(e)))
  }, [])
  useEffect(() => {
    if (engineReady)
      void drawScene(useGameStore.getState()).catch((e) =>
        setEngineError(String(e)),
      )
  }, [
    engineReady,
    state.currentCaseId,
    state.phase,
    state.activeCharacterId,
    state.sessionId,
  ]) // scene reads only these fields
  useEffect(() => {
    if (state.phase === 'home' || state.phase === 'case_select')
      void listSaves()
        .then((s) => {
          setAutoSave(s[0])
          return listCaseProgress()
        })
        .then(setProgress)
        .catch(() => {})
  }, [state.phase])
  const openCase = (id: string) => {
    state.openCase(id)
    setTab('history')
    setNotice('')
  }
  const character = c.characters.find((p) => p.id === state.activeCharacterId)!
  const speech = [...state.turns]
    .reverse()
    .find(
      (t) =>
        t.speakerId === state.activeCharacterId &&
        t.turnType !== 'player_question',
    )
  const assign = (id: string, role: VerdictAssignment) => {
    if (cast.some((p) => p.id === id))
      useGameStore.setState((s) => ({
        verdictRoles: { ...s.verdictRoles, [id]: role },
      }))
  }
  const reportSteps = [
    c.reporter.statement,
    c.reporter.concern,
    ...c.involvedParties.map(
      (p) =>
        `${c.characters.find((ch) => ch.id === p.characterId)?.name}：${p.relationship} ${p.summonsReason}`,
    ),
    ...c.evidence
      .filter((e) => e.stage === 'initial')
      .map((e) => `${e.title}：${e.content}`),
  ]
  return (
    <div
      className={
        'app phase-' +
        state.phase +
        (settings.reduceMotion ? ' reduce-motion' : '')
      }
      style={{ '--reading-size': settings.fontSize + 'px' } as CSSProperties}
    >
      <div className="scene" ref={canvasRef} aria-hidden="true" />
      <div className="scene-shade" />
      <header className="topbar">
        <button className="brand" onClick={() => state.setPhase('home')}>
          <span className="seal">真相</span>
          <span>
            真相圆桌<small>TRUTHROUND</small>
          </span>
        </button>
        <div className="topbar-center">
          {state.phase === 'home'
            ? '老街事务所 · 灯还亮着'
            : state.phase === 'case_select'
              ? '卷宗室'
              : c.title}
        </div>
        <nav>
          <span className="save-status">
            {saveStatus.error
              ? '存档失败，请手动保存'
              : saveStatus.saving
                ? '保存中…'
                : saveStatus.message}
          </span>
          <button
            className="icon-button"
            onClick={() => setModal('saves')}
            aria-label="存读档"
          >
            <Save size={20} />
          </button>
          <button
            className="icon-button"
            onClick={() => setModal('settings')}
            aria-label="设置"
          >
            <Settings size={20} />
          </button>
        </nav>
      </header>
      {(!engineReady || engineError) && (
        <div className="engine-status" role="status">
          {engineError ? (
            '场景加载失败：' + engineError
          ) : (
            <>
              <LoaderCircle className="spin" /> 正在点亮事务所…
            </>
          )}
        </div>
      )}
      {state.phase === 'home' && (
        <main className="home">
          <div className="home-copy">
            <span className="eyebrow">一张圆桌，几段口供，一件未了的事。</span>
            <h1>
              街坊各有说法。
              <br />
              <em>真相，等你来问。</em>
            </h1>
            <p>
              老街的灯又亮了。有人敲门报案，
              <br />
              有人欲言又止。坐下来，听清每一个细节。
            </p>
            <div className="home-actions">
              <button
                className="primary"
                disabled={!engineReady}
                onClick={() => state.goToCaseSelect()}
              >
                开始新调查 <ArrowRight size={19} />
              </button>
              <button
                className="home-continue"
                disabled={!autoSave || !engineReady}
                onClick={() => {
                  void loadSave(autoSave).catch((e) => setNotice(e.message))
                }}
              >
                继续调查 <ChevronRight size={17} />
                <small>
                  {autoSave
                    ? getCaseDefinition(autoSave.caseId).title
                    : '尚无调查记录'}
                </small>
              </button>
            </div>
            <div className="home-links">
              <button onClick={() => setModal('saves')}>
                <FolderOpen size={16} /> 存读档
              </button>
              <button onClick={() => setModal('settings')}>偏好设置</button>
            </div>
          </div>
          <div className="home-stamp">
            <span>灯笼巷</span>
            <i>有事慢慢说</i>
          </div>
          <footer className="home-footer">
            <span>叙事推理 · 自由盘问 · 证据裁决</span>
            <span>第〇二版 / 0.2.0</span>
          </footer>
        </main>
      )}
      {state.phase === 'case_select' && (
        <main className="case-room paper">
          <div className="section-heading">
            <div>
              <span className="eyebrow">卷宗室 / CASE FILES</span>
              <h1>今天，从哪一案开始？</h1>
              <p>街巷里的小事，也值得一个清楚的交代。</p>
            </div>
            <button
              className="text-button"
              onClick={() => state.setPhase('home')}
            >
              <ArrowLeft size={16} /> 返回事务所
            </button>
          </div>
          <div className="case-grid">
            {caseList.map((item, index) => (
              <button
                className={'case-card ' + item.status}
                disabled={item.status === 'locked' || !engineReady}
                key={item.id}
                onClick={() => openCase(item.id)}
              >
                <div className="case-illustration">
                  {item.caseDefinition ? (
                    <img
                      src={item.caseDefinition.sceneAssets.storefront}
                      alt=""
                    />
                  ) : (
                    <span>待</span>
                  )}
                  <span className="file-number">
                    卷宗 {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="case-body">
                  <div className="case-meta">
                    <span>
                      {item.status === 'unlocked' ? '可受理' : '待开放'}
                    </span>
                    <span>
                      {'●'.repeat(item.difficulty)}
                      {'○'.repeat(5 - item.difficulty)}
                    </span>
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.summary}</p>
                  <footer>
                    <span>
                      {progress[item.id]
                        ? progress[item.id].phase === 'result'
                          ? '已结案'
                          : `调查进行中 · 已核实 ${progress[item.id].evidence} 条证据`
                        : item.tags.join(' · ')}
                    </span>
                    {item.status === 'unlocked' && <ArrowRight size={20} />}
                  </footer>
                </div>
              </button>
            ))}
          </div>
        </main>
      )}
      {state.phase === 'report' && (
        <main className="report-layout">
          <div className="report-person">
            <span className="location-tag">来访记录 / {c.reporter.name}</span>
          </div>
          <section className="report-paper paper">
            <span className="eyebrow">
              受理记录 ·{' '}
              {String(caseList.findIndex((i) => i.id === c.id) + 1).padStart(
                2,
                '0',
              )}
            </span>
            <h1>{c.title}</h1>
            <p className="report-lead">{c.incidentSummary}</p>
            <div className="report-rule" />
            <span className="eyebrow">
              {state.reportStep < 2
                ? '报案人陈述'
                : state.reportStep < 2 + c.involvedParties.length
                  ? '相关人物'
                  : '基础证据'}{' '}
              · {state.reportStep + 1}/{reportSteps.length}
            </span>
            <h2>
              {state.reportStep < 2
                ? c.reporter.name
                : state.reportStep < 2 + c.involvedParties.length
                  ? '请到圆桌的人'
                  : '已经确认的情况'}
            </h2>
            <p className="report-statement">{reportSteps[state.reportStep]}</p>
            <nav className="report-progress" aria-label="受理信息">
              {reportSteps.map((_, i) => (
                <button
                  key={i}
                  className={i <= state.reportStep ? 'active' : ''}
                  aria-label={`查看第 ${i + 1} 条受理信息`}
                  aria-current={i === state.reportStep ? 'step' : undefined}
                  title={`第 ${i + 1} 条受理信息`}
                  onClick={() => useGameStore.setState({ reportStep: i })}
                />
              ))}
            </nav>
            <div className="report-actions">
              <button
                className="text-button"
                onClick={() => state.startRoundtable()}
              >
                跳过演出，进入圆桌
              </button>
              <div className="report-step-actions">
                <button
                  disabled={state.reportStep === 0}
                  onClick={() =>
                    useGameStore.setState({ reportStep: state.reportStep - 1 })
                  }
                >
                  <ArrowLeft size={17} /> 上一条
                </button>
                <button
                  className="primary"
                  onClick={() =>
                    state.reportStep === reportSteps.length - 1
                      ? state.startRoundtable()
                      : useGameStore.setState({
                          reportStep: state.reportStep + 1,
                        })
                  }
                >
                  {state.reportStep === reportSteps.length - 1
                    ? '开始盘问'
                    : '继续听'}
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </section>
        </main>
      )}
      {state.phase === 'roundtable' && (
        <main className="roundtable-layout">
          <section className="conversation-stage">
            <div className="stage-top">
              <span className="location-tag">
                圆桌问话 ·{' '}
                {c.id === 'missing-lantern-parcel' ? '灯笼巷' : '梧桐镇'}
              </span>
              <button
                className="folio-toggle"
                onClick={() => setFolioOpen(!folioOpen)}
              >
                <BookOpen size={17} /> 调查卷宗
              </button>
            </div>
            <div className="cast-list" aria-label="选择问话人物">
              {cast.map((p) => (
                <button
                  aria-pressed={p.id === state.activeCharacterId}
                  key={p.id}
                  onClick={() => state.setActiveCharacter(p.id)}
                >
                  <img src={p.avatar} alt="" />
                  <span>{p.name}</span>
                  {p.id === state.activeCharacterId && (
                    <span className="cast-dot" />
                  )}
                </button>
              ))}
            </div>
            <div className="stage-space">
              <span className="person-name">
                {character.name}
                <small>{character.publicBackground}</small>
              </span>
            </div>
            <section className="speech-panel">
              <header>
                <span className="eyebrow">当前发言</span>
                <strong>{character.name}</strong>
                {speech && (
                  <button
                    className="quote-button"
                    onClick={() => state.selectQuote(speech.id)}
                  >
                    <Quote size={14} /> 引用追问
                  </button>
                )}
              </header>
              <Speech key={speech?.id || character.id} turn={speech} />
            </section>
            <form
              className="question-panel"
              onSubmit={(e) => {
                e.preventDefault()
                void runInvestigation('question')
              }}
            >
              {state.selectedQuote && (
                <div className="selected-quote">
                  <Quote size={15} />
                  <span>{state.selectedQuote.content}</span>
                  <button
                    type="button"
                    aria-label="取消引用"
                    onClick={() => state.clearQuote()}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="question-toolbar">
                <div className="segmented">
                  <button
                    type="button"
                    className={state.questionMode === 'single' ? 'active' : ''}
                    onClick={() =>
                      useGameStore.setState({ questionMode: 'single' })
                    }
                  >
                    问 {character.name}
                  </button>
                  <button
                    type="button"
                    className={state.questionMode === 'all' ? 'active' : ''}
                    onClick={() =>
                      useGameStore.setState({ questionMode: 'all' })
                    }
                  >
                    询问所有人
                  </button>
                </div>
                <button
                  type="button"
                  className="text-button"
                  disabled={req.busy}
                  onClick={() => state.setPhase('verdict')}
                >
                  进入裁决 <ArrowRight size={15} />
                </button>
              </div>
              <div className="question-input">
                <textarea
                  aria-label="输入盘问问题"
                  placeholder="从一句不一致的话，或一个被忽略的细节问起…"
                  maxLength={1500}
                  rows={2}
                  value={state.draft}
                  onChange={(e) =>
                    useGameStore.setState({ draft: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      void runInvestigation('question')
                    }
                  }}
                />
                <button
                  className="primary"
                  disabled={req.busy || !state.draft.trim()}
                  type="submit"
                >
                  <MessageCircle size={18} /> 发问
                </button>
              </div>
              <div className="request-line" role="status">
                {req.busy ? (
                  <>
                    <LoaderCircle className="spin" size={14} />
                    <span>{req.label}</span>
                    <button type="button" onClick={cancelInvestigation}>
                      <Pause size={12} />
                      取消
                    </button>
                  </>
                ) : req.error ? (
                  <>
                    <span className="error-text">{req.error}</span>
                    {req.retry && (
                      <button
                        type="button"
                        onClick={() => void runInvestigation(req.retry!, true)}
                      >
                        重试
                      </button>
                    )}
                  </>
                ) : state.round &&
                  (state.round.failedIds.length ||
                    !state.round.evidenceChecked) ? (
                  <>
                    <span>上次问话尚未完成，已保留成功口供。</span>
                    <button
                      type="button"
                      onClick={() => void runInvestigation('question', true)}
                    >
                      继续未完成问话
                    </button>
                  </>
                ) : (
                  <span>自由输入 · ⌘ / Ctrl + Enter 发问</span>
                )}
              </div>
            </form>
          </section>
          <aside className={'dossier paper ' + (folioOpen ? 'open' : '')}>
            <button
              className="close-folio icon-button"
              aria-label="收起卷宗"
              onClick={() => setFolioOpen(false)}
            >
              <X size={18} />
            </button>
            <Dossier tab={tab} setTab={setTab} />
          </aside>
        </main>
      )}
      {state.phase === 'verdict' && (
        <main className="verdict-page paper">
          <div className="section-heading">
            <div>
              <span className="eyebrow">最后的判断 / YOUR VERDICT</span>
              <h1>每个人，都需要一个交代。</h1>
              <p>拖入对应归类，或先点击人物再点击类别。全部归类后提交。</p>
            </div>
            <button
              className="text-button"
              onClick={() => state.setPhase('roundtable')}
            >
              <ArrowLeft size={16} /> 继续调查
            </button>
          </div>
          <div className="verdict-cast">
            {cast.map((p) => (
              <button
                key={p.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                className={
                  'verdict-person ' + (selectedCard === p.id ? 'selected' : '')
                }
                onClick={() => setSelectedCard(p.id)}
              >
                <img src={p.avatar} alt="" />
                <strong>{p.name}</strong>
                <small>
                  {verdictRoleOptions.find(
                    (r) => r.role === state.verdictRoles[p.id],
                  )?.label || '尚未归类'}
                </small>
              </button>
            ))}
          </div>
          <div className="verdict-buckets">
            {verdictRoleOptions.map((option) => (
              <section
                className={'verdict-bucket ' + option.role}
                key={option.role}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  assign(e.dataTransfer.getData('text/plain'), option.role)
                }}
              >
                <button
                  className="bucket-heading"
                  onClick={() => {
                    if (selectedCard) {
                      assign(selectedCard, option.role)
                      setSelectedCard('')
                    }
                  }}
                >
                  <span>{option.label}</span>
                  <small>点击归入所选人物</small>
                </button>
                <div>
                  {cast
                    .filter((p) => state.verdictRoles[p.id] === option.role)
                    .map((p) => (
                      <button
                        key={p.id}
                        className="assigned-person"
                        onClick={() => assign(p.id, 'unassigned')}
                      >
                        {p.name}
                        <X size={14} />
                      </button>
                    ))}
                </div>
              </section>
            ))}
          </div>
          <footer className="verdict-submit">
            <p>
              {
                Object.values(state.verdictRoles).filter(
                  (r) => r !== 'unassigned',
                ).length
              }
              /{cast.length} 人已归类 · 提交后查看评分与完整真相
            </p>
            <button
              className="primary"
              disabled={!isVerdictComplete(state.verdictRoles)}
              onClick={() =>
                state.submitVerdict(
                  buildPlayerVerdictFromRoles(state.verdictRoles),
                )
              }
            >
              提交裁决 <CheckCircle2 size={18} />
            </button>
          </footer>
        </main>
      )}
      {state.phase === 'result' && state.result && (
        <main className="result-page paper">
          <span className="eyebrow">卷宗已结 / CASE CLOSED</span>
          <div className="result-score">
            {state.result.score}
            <small>分</small>
          </div>
          <h1>
            {state.result.score === 100
              ? '线索终于连成了真相。'
              : '每一处疏漏，都值得再想一想。'}
          </h1>
          <p className="result-case">{c.title}</p>
          <div className="result-checks">
            {[
              [state.result.correctCulprit, '主谋'],
              [state.result.correctAccomplices, '包庇者'],
              [state.result.correctInnocents, '无辜者'],
            ].map(([ok, label]) => (
              <span key={String(label)} className={ok ? 'correct' : ''}>
                {ok ? <Check size={17} /> : <X size={17} />} {label}判断
              </span>
            ))}
          </div>
          <section>
            <h2>事情的来龙去脉</h2>
            <p>{state.result.explanation}</p>
            <details>
              <summary>查看完整时间线</summary>
              {c.truthTimeline.map((line, i) => (
                <p key={i}>
                  {i + 1}. {line}
                </p>
              ))}
            </details>
          </section>
          <footer>
            <button onClick={() => openCase(c.id)}>重新调查</button>
            <button className="primary" onClick={() => state.goToCaseSelect()}>
              翻开下一份卷宗 <ArrowRight size={18} />
            </button>
          </footer>
        </main>
      )}
      {notice && (
        <div className="toast" role="alert">
          {notice}
          <button onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={modal === 'settings' ? '偏好与连接' : '存读档'}
          close={() => setModal(null)}
        >
          {modal === 'settings' ? (
            <SettingsPanel />
          ) : (
            <SavePanel close={() => setModal(null)} />
          )}
        </Modal>
      )}
    </div>
  )
}
