import {
  Brain,
  ClipboardCheck,
  FileText,
  Gavel,
  Lock,
  MapPin,
  MessageSquareText,
  Users,
  Quote,
  RotateCcw,
  Search,
  Send,
  Terminal,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './App.css'
import gameCover from './assets/game-cover.png'
import { requestAI } from './game/aiClient'
import { caseList, demoCase, playableCharacters } from './game/cases'
import {
  formatAI2StructuredSummary,
  getLockedEvidence,
  getRevealedEvidence,
  makeTurn,
  parseAI2StructuredSummary,
  parseTriggeredEvidenceIds,
} from './game/logic'
import type { AI2StructuredSummary, ConversationTurn, EvidenceDefinition, PlayerVerdict } from './game/types'
import { useGameStore } from './store/gameStore'
import { isInterfaceLoggingEnabled, useInterfaceLogStore } from './store/interfaceLogStore'

function App() {
  const {
    phase,
    activeCharacterId,
    useMockAI,
    turns,
    latestSummary,
    latestStructuredSummary,
    selectedQuote,
    revealedEvidenceIds,
    discoveredEvidenceIds,
    result,
    goToCaseSelect,
    openCase,
    setPhase,
    setActiveCharacter,
    startRoundtable,
    addTurn,
    clearQuote,
    selectQuote,
    discoverEvidence,
    revealEvidence,
    setSummary,
    submitVerdict,
    resetGame,
  } = useGameStore()
  const [question, setQuestion] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [selectedCulprit, setSelectedCulprit] = useState('lin')
  const [selectedAccomplices, setSelectedAccomplices] = useState<string[]>(['qiao'])
  const [selectedInnocents, setSelectedInnocents] = useState<string[]>(['chen', 'wu'])
  const [isCaseDossierOpen, setIsCaseDossierOpen] = useState(false)
  const [isClueAnalysisOpen, setIsClueAnalysisOpen] = useState(false)
  const [evidenceNotice, setEvidenceNotice] = useState<EvidenceDefinition[] | null>(null)
  const activeCharacter = playableCharacters.find((character) => character.id === activeCharacterId) || playableCharacters[0]
  const transcriptRef = useRef<HTMLDivElement | null>(null)

  const visibleTurns = useMemo(() => turns, [turns])
  const roundtableCharacters = useMemo(
    () => [demoCase.characters.find((character) => character.id === 'zhou'), ...playableCharacters].filter(Boolean),
    [],
  )
  const revealedEvidence = useMemo(() => getRevealedEvidence(demoCase, revealedEvidenceIds), [revealedEvidenceIds])
  const lockedEvidence = useMemo(() => getLockedEvidence(demoCase, revealedEvidenceIds), [revealedEvidenceIds])
  const unlockableEvidence = useMemo(() => demoCase.evidence.filter((evidence) => evidence.stage === 'unlockable'), [])

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [turns.length])

  async function askCharacter() {
    const trimmed = question.trim()
    if (!trimmed || isThinking) {
      return
    }

    setIsThinking(true)
    const quotedTurn = selectedQuote
    const playerTurn = makeTurn('player', trimmed, 'player_question', activeCharacterId, quotedTurn)
    addTurn(playerTurn)
    clearQuote()
    setQuestion('')

    const response = await requestAI(
      {
        mode: 'roleplay',
        caseId: demoCase.id,
        characterId: activeCharacterId,
        playerQuestion: trimmed,
        quotedTurn,
        conversationHistory: [...turns, playerTurn],
      },
      useMockAI,
    )

    const answerTurn = makeTurn(
      activeCharacterId,
      response.error ? `${response.content}\n\n【接口提示】${response.error}` : response.content,
      'character_answer',
    )
    addTurn(answerTurn)

    if (!response.error) {
      const checkResponse = await requestAI(
        {
          mode: 'evidence_check',
          caseId: demoCase.id,
          conversationHistory: [...turns, playerTurn, answerTurn],
          revealedEvidenceIds,
          discoveredEvidenceIds,
        },
        useMockAI,
      )

      if (!checkResponse.error) {
        try {
          const triggeredEvidenceIds = parseTriggeredEvidenceIds(
            checkResponse.content,
            lockedEvidence.map((evidence) => evidence.id),
          )
          const newlyDiscoveredEvidence = triggeredEvidenceIds
            .filter((id) => !discoveredEvidenceIds.includes(id))
            .map((id) => demoCase.evidence.find((evidence) => evidence.id === id))
            .filter((evidence): evidence is EvidenceDefinition => Boolean(evidence))

          discoverEvidence(triggeredEvidenceIds)

          if (newlyDiscoveredEvidence.length > 0) {
            playEvidenceNoticeSound()
            setEvidenceNotice(newlyDiscoveredEvidence)
          }
        } catch {
          // Evidence discovery is auxiliary; the interface log keeps the raw response for debugging.
        }
      }
    }
    setIsThinking(false)
  }

  async function askAssistant() {
    if (isThinking) {
      return
    }

    setIsThinking(true)
    const response = await requestAI(
      {
        mode: 'assistant_summary',
        caseId: demoCase.id,
        conversationHistory: turns,
        revealedEvidenceIds,
        discoveredEvidenceIds,
      },
      useMockAI,
    )

    let structuredSummary: AI2StructuredSummary | undefined
    let summaryContent = response.content

    if (!response.error) {
      try {
        structuredSummary = parseAI2StructuredSummary(response.content)
        summaryContent = formatAI2StructuredSummary(structuredSummary)
      } catch (error) {
        summaryContent = `【线索研判失败】\nDeepSeek 没有返回可解析的四块 JSON。\n\n原始内容：\n${response.content}\n\n错误：${error instanceof Error ? error.message : String(error)}`
      }
    }

    setSummary(response.error ? `${response.content}\n\n【接口提示】${response.error}` : summaryContent, 'contradictions', structuredSummary)
    setIsThinking(false)
  }

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  }

  function finishVerdict() {
    const verdict: PlayerVerdict = {
      culpritId: selectedCulprit,
      accompliceIds: selectedAccomplices,
      innocentIds: selectedInnocents,
    }
    submitVerdict(verdict)
  }

  return (
    <main className={phase === 'roundtable' ? 'app-shell game-shell' : 'app-shell'}>
      {phase !== 'home' && phase !== 'roundtable' && (
        <header className="topbar">
          <div>
            <p className="eyeline">TruthRound MVP</p>
            <h1>真相圆桌</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" type="button" onClick={resetGame}>
              <RotateCcw data-icon="inline-start" />
              重开
            </button>
          </div>
        </header>
      )}

      {phase === 'home' && <HomeScreen onStart={goToCaseSelect} />}

      {phase === 'case_select' && <CaseSelectScreen onOpenCase={openCase} />}

      {phase === 'report' && (
        <section
          className="report-scene"
          style={{ '--scene-bg': `url(${demoCase.sceneAssets.storefront})` } as CSSProperties}
        >
          <div className="report-scene-backdrop" />
          <div className="report-stage">
            <section className="case-scroll">
              <p className="scene-kicker">街坊报案</p>
              <h2>{demoCase.title}</h2>
              <p className="incident-copy">{demoCase.incidentSummary}</p>
              <div className="reporter-statement">
                <div className="stamp-label">
                  <Gavel />
                  <span>报案人 · {demoCase.reporter.name}</span>
                </div>
                <p>{demoCase.reporter.identity}</p>
                <p>{demoCase.reporter.concern}</p>
                <blockquote>{demoCase.reporter.statement}</blockquote>
              </div>
              <div className="police-note visual-note">
                <Gavel />
                <span>老周负责传唤、控场、记录；他不会推理，也不会替你找答案。</span>
              </div>
              <button className="primary-button start-roundtable-button" type="button" onClick={startRoundtable}>
                <MessageSquareText data-icon="inline-start" />
                开始圆桌盘问
              </button>
            </section>

            <aside className="report-character-stage" aria-label={`${demoCase.reporter.name}立绘`}>
              <img alt={demoCase.reporter.name} className="reporter-portrait" src={demoCase.reporter.portrait} />
              <div className="speaker-nameplate">
                <span>小卖部老板娘</span>
                <strong>{demoCase.reporter.name}</strong>
              </div>
            </aside>

            <section className="case-brief-tray">
              <div className="party-strip">
                <div className="tray-title">
                  <Users />
                  <span>老周请到圆桌的人</span>
                </div>
                <div className="party-token-list">
                  {demoCase.involvedParties.map((party) => (
                    <InvolvedPartyToken party={party} key={party.characterId} />
                  ))}
                </div>
              </div>
              <div className="evidence-strip">
                <div className="tray-title">
                  <MapPin />
                  <span>老周已确认</span>
                </div>
                <div className="paper-note-list">
                  {revealedEvidence.map((evidence, index) => (
                    <EvidencePaper evidence={evidence} index={index} key={evidence.id} />
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      )}

      {phase === 'roundtable' && (
        <section
          className="roundtable-scene"
          style={{ '--roundtable-bg': `url(${demoCase.sceneAssets.roundtable})` } as CSSProperties}
        >
          <div className="roundtable-backdrop" />
          <div className="roundtable-topbar">
            <div>
              <p className="section-label">圆桌盘问</p>
              <h2>{demoCase.title}</h2>
            </div>
            <div className="roundtable-actions">
              <button className="ghost-button" type="button" onClick={() => setIsCaseDossierOpen(true)}>
                <FileText data-icon="inline-start" />
                案情档案
              </button>
              <button className="ghost-button" type="button" onClick={() => setIsClueAnalysisOpen(true)}>
                <Brain data-icon="inline-start" />
                线索研判
              </button>
              <button className="primary-button" type="button" onClick={() => setPhase('verdict')}>
                <ClipboardCheck data-icon="inline-start" />
                去裁决
              </button>
            </div>
          </div>

          <div className="roundtable-main">
            <section className="roundtable-character-list" aria-label="圆桌人物列表">
              {roundtableCharacters.map((character) => {
                if (!character) {
                  return null
                }

                const isPolice = character.roleType === 'police'
                const isActive = character.id === activeCharacterId

                return (
                  <button
                    className={roundtableCharacterClassName(character.id, isActive, isPolice)}
                    disabled={isPolice}
                    key={character.id}
                    type="button"
                    onClick={() => setActiveCharacter(character.id)}
                  >
                    <img alt={character.name} src={character.portrait} />
                    <span className="character-nameplate">
                      <strong>{character.name}</strong>
                    </span>
                  </button>
                )
              })}
            </section>

            <section className="dialogue-panel roundtable-dialogue">
              <div className="panel-heading">
                <div>
                  <p className="section-label">当前盘问</p>
                  <h2>{activeCharacter.name}</h2>
                </div>
                <span className="target-hint">正在盘问：{activeCharacter.name}</span>
              </div>

              <div className="transcript" aria-live="polite" ref={transcriptRef}>
                {visibleTurns.map((turn) => (
                  <article className={turnClassName(turn)} key={turn.id}>
                    <div className="turn-header">
                      <span>{speakerName(turn.speakerId)}</span>
                      {turn.speakerId !== 'ai2' && (
                        <button className="quote-button" type="button" onClick={() => selectQuote(turn.id)}>
                          <Quote />
                          引用
                        </button>
                      )}
                    </div>
                    {turn.quotedExcerpt && <QuotePreview quote={turn.quotedExcerpt} />}
                    <p>{turn.content}</p>
                  </article>
                ))}
              </div>

              <div className="question-box">
                {selectedQuote && (
                  <div className="selected-quote">
                    <QuotePreview
                      quote={{
                        speakerId: selectedQuote.speakerId,
                        content: selectedQuote.content,
                      }}
                    />
                    <button className="icon-button" type="button" aria-label="取消引用" onClick={clearQuote}>
                      <X />
                    </button>
                  </div>
                )}
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={`盘问${activeCharacter.name}：你可以自由追问、反问、套话...`}
                />
                <div className="question-actions">
                  <button className="primary-button" type="button" disabled={isThinking} onClick={askCharacter}>
                    <Send data-icon="inline-start" />
                    {isThinking ? '思考中' : '追问'}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {isCaseDossierOpen && (
            <aside className="roundtable-drawer dossier-drawer">
              <div className="drawer-header">
                <div>
                  <p className="section-label">案情档案</p>
                  <h2>老周移交的案卷</h2>
                </div>
                <button className="icon-button" type="button" aria-label="关闭案情档案" onClick={() => setIsCaseDossierOpen(false)}>
                  <X />
                </button>
              </div>
              <section className="drawer-section">
                <h3>报案人</h3>
                <p>
                  <strong>{demoCase.reporter.name}</strong>：{demoCase.reporter.identity}
                </p>
                <p>{demoCase.reporter.concern}</p>
                <blockquote>{demoCase.reporter.statement}</blockquote>
              </section>
              <section className="drawer-section">
                <h3>案情简介</h3>
                <p>{demoCase.incidentSummary}</p>
              </section>
              <section className="drawer-section">
                <h3>涉及人员关系</h3>
                {demoCase.involvedParties.map((party) => {
                  const character = demoCase.characters.find((item) => item.id === party.characterId)

                  return (
                    <article className="dossier-party" key={party.characterId}>
                      {character && <img alt={character.name} src={character.avatar} />}
                      <div>
                        <strong>{character?.name || party.characterId}</strong>
                        <span>{party.relationship}</span>
                        <small>{party.summonsReason}</small>
                      </div>
                    </article>
                  )
                })}
              </section>
              <EvidenceDrawerContent
                discoveredEvidenceIds={discoveredEvidenceIds}
                onRevealEvidence={revealEvidence}
                revealedEvidence={revealedEvidence}
                revealedEvidenceIds={revealedEvidenceIds}
                unlockableEvidence={unlockableEvidence}
              />
            </aside>
          )}

          {isClueAnalysisOpen && (
            <aside className="roundtable-drawer clue-drawer">
              <div className="drawer-header">
                <div>
                  <p className="section-label">线索研判</p>
                  <h2>侦探札记</h2>
                </div>
                <button className="icon-button" type="button" aria-label="关闭侦探札记" onClick={() => setIsClueAnalysisOpen(false)}>
                  <X />
                </button>
              </div>
              <button className="secondary-button" type="button" disabled={isThinking} onClick={askAssistant}>
                <Brain data-icon="inline-start" />
                {isThinking ? '研判中' : '生成研判'}
              </button>
              {latestStructuredSummary ? (
                <StructuredSummaryView summary={latestStructuredSummary} />
              ) : (
                <pre className="summary-output">
                  {latestSummary ||
                    '根据你已经收集到的发言与证据，生成时间线、矛盾点、嫌疑点和线索缺口。研判只整理迷雾，不直接公布答案。'}
                </pre>
              )}
            </aside>
          )}

          {evidenceNotice && (
            <EvidenceNoticeModal
              evidence={evidenceNotice}
              onClose={() => setEvidenceNotice(null)}
              onOpenDossier={() => {
                setEvidenceNotice(null)
                setIsCaseDossierOpen(true)
              }}
            />
          )}
        </section>
      )}

      {phase === 'verdict' && (
        <section className="verdict-panel">
          <p className="section-label">最终裁决</p>
          <h2>你是唯一判案的人</h2>
          <VerdictChooser title="主谋" selected={[selectedCulprit]} onToggle={(id) => setSelectedCulprit(id)} />
          <VerdictChooser
            title="包庇者"
            selected={selectedAccomplices}
            onToggle={(id) => setSelectedAccomplices((current) => toggleId(current, id))}
          />
          <VerdictChooser
            title="无辜者"
            selected={selectedInnocents}
            onToggle={(id) => setSelectedInnocents((current) => toggleId(current, id))}
          />
          <div className="verdict-actions">
            <button className="ghost-button" type="button" onClick={() => setPhase('roundtable')}>
              返回盘问
            </button>
            <button className="primary-button" type="button" onClick={finishVerdict}>
              <Gavel data-icon="inline-start" />
              提交裁决
            </button>
          </div>
        </section>
      )}

      {phase === 'result' && result && (
        <section className="result-panel">
          <p className="section-label">结案反馈</p>
          <h2>{result.score} 分</h2>
          <div className="score-grid">
            <ScoreItem label="主谋判断" ok={result.correctCulprit} />
            <ScoreItem label="包庇者判断" ok={result.correctAccomplices} />
            <ScoreItem label="无辜者判断" ok={result.correctInnocents} />
          </div>
          <p className="truth-text">{result.explanation}</p>
          <button className="primary-button" type="button" onClick={resetGame}>
            再开一局
          </button>
        </section>
      )}

      {isInterfaceLoggingEnabled() && <InterfaceLogPanel />}
    </main>
  )
}

function InterfaceLogPanel() {
  const { entries, clearEntries } = useInterfaceLogStore()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <aside className={isOpen ? 'interface-log-panel open' : 'interface-log-panel'}>
      <div className="interface-log-header">
        <button className="ghost-button" type="button" onClick={() => setIsOpen((value) => !value)}>
          <Terminal data-icon="inline-start" />
          接口日志
          <span>{entries.length}</span>
        </button>
        {isOpen && (
          <button className="icon-button" type="button" aria-label="清空接口日志" onClick={clearEntries}>
            <Trash2 />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="interface-log-body">
          {entries.length === 0 ? (
            <p className="empty-log">还没有接口记录。触发一次追问或线索研判后，这里会显示请求和响应。</p>
          ) : (
            entries.map((entry) => (
              <details className={`log-entry ${entry.status}`} key={entry.id}>
                <summary>
                  <span>{entry.interfaceName}</span>
                  <small>
                    {entry.mode} · {entry.provider} · {entry.status} · {entry.durationMs}ms
                  </small>
                </summary>
                <pre>{JSON.stringify({ request: entry.request, response: entry.response, error: entry.error }, null, 2)}</pre>
              </details>
            ))
          )}
        </div>
      )}
    </aside>
  )
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="home-screen" style={{ '--home-bg': `url(${gameCover})` } as CSSProperties}>
      <div className="home-backdrop" />
      <div className="home-content">
        <p className="scene-kicker">生活化 AI 圆桌盘问推理游戏</p>
        <h1>真相圆桌</h1>
        <p className="home-copy">
          你是民间侦探，民警负责把人请到圆桌，街坊会各自隐瞒与辩解，线索研判只帮你整理信息但不揭答案。
        </p>
        <div className="home-feature-row">
          <span>自由盘问</span>
          <span>证据核实</span>
          <span>圆桌裁决</span>
        </div>
        <button className="primary-button home-start-button" type="button" onClick={onStart}>
          <MessageSquareText data-icon="inline-start" />
          开始游戏
        </button>
        <p className="version-note">0.0.1 文字剧情原型 / 游戏化界面开发中</p>
      </div>
    </section>
  )
}

function CaseSelectScreen({ onOpenCase }: { onOpenCase: (caseId: string) => void }) {
  return (
    <section
      className="case-select-screen"
      style={{ '--case-select-bg': `url(${demoCase.sceneAssets.evidenceBoard})` } as CSSProperties}
    >
      <div className="case-select-header">
        <p className="scene-kicker">案件档案</p>
        <h2>选择要调查的案子</h2>
        <p>第一批开放 5 个案卷。当前只有第一案可以进入，其余案件还锁在档案柜里。</p>
      </div>
      <div className="case-card-grid">
        {caseList.map((item) => (
          <button
            className={item.status === 'unlocked' ? 'case-file-card unlocked' : 'case-file-card locked'}
            disabled={item.status === 'locked'}
            key={item.id}
            type="button"
            onClick={() => onOpenCase(item.id)}
          >
            <div className="file-tab">{item.status === 'unlocked' ? '已解锁' : '未解锁'}</div>
            <div className="case-file-title-row">
              <strong>{item.title}</strong>
              {item.status === 'locked' && <Lock />}
            </div>
            <span className="case-summary">{item.summary}</span>
            <span className="difficulty-stars" aria-label={`难度 ${item.difficulty} 星`}>
              {Array.from({ length: 5 }, (_, index) => (
                <span className={index < item.difficulty ? 'filled' : ''} key={index}>
                  ★
                </span>
              ))}
            </span>
            <div className="case-tag-row">
              {item.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function VerdictChooser({
  title,
  selected,
  onToggle,
}: {
  title: string
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="verdict-group">
      <h3>{title}</h3>
      <div className="choice-row">
        {playableCharacters.map((character) => (
          <button
            className={selected.includes(character.id) ? 'choice active' : 'choice'}
            key={character.id}
            type="button"
            onClick={() => onToggle(character.id)}
          >
            {character.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function EvidenceRow({ evidence, compact = false }: { evidence: EvidenceDefinition; compact?: boolean }) {
  return (
    <div className={compact ? 'evidence-row compact' : 'evidence-row'}>
      <FileText />
      <span>
        <strong>{evidence.title}</strong>
        {evidence.content}
      </span>
    </div>
  )
}

function InvolvedPartyToken({ party }: { party: { characterId: string; relationship: string; summonsReason: string } }) {
  const character = demoCase.characters.find((item) => item.id === party.characterId)

  return (
    <article className="party-token" title={`${party.relationship} ${party.summonsReason}`}>
      {character && <img alt={character.name} src={character.avatar} />}
      <div>
        <strong>{character?.name || party.characterId}</strong>
        <span>{party.summonsReason}</span>
      </div>
    </article>
  )
}

function EvidencePaper({ evidence, index }: { evidence: EvidenceDefinition; index: number }) {
  return (
    <article className="evidence-paper" style={{ '--note-index': index } as CSSProperties}>
      <FileText />
      <div>
        <strong>{evidence.title}</strong>
        <span>{evidence.content}</span>
      </div>
    </article>
  )
}

function EvidenceDrawerContent({
  discoveredEvidenceIds,
  onRevealEvidence,
  revealedEvidence,
  revealedEvidenceIds,
  unlockableEvidence,
}: {
  discoveredEvidenceIds: string[]
  onRevealEvidence: (evidenceId: string) => void
  revealedEvidence: EvidenceDefinition[]
  revealedEvidenceIds: string[]
  unlockableEvidence: EvidenceDefinition[]
}) {
  return (
    <>
      <section className="drawer-section">
        <h3>老周已确认</h3>
        {revealedEvidence.map((evidence) => (
          <EvidenceRow evidence={evidence} key={evidence.id} compact />
        ))}
      </section>
      <section className="drawer-section">
        <h3>关键证据槽</h3>
        {unlockableEvidence.length > 0 ? (
          unlockableEvidence.map((evidence, index) => {
            const isRevealed = revealedEvidenceIds.includes(evidence.id)
            const isDiscovered = discoveredEvidenceIds.includes(evidence.id)

            return (
              <div className={isDiscovered || isRevealed ? 'unlock-row discovered' : 'unlock-row'} key={evidence.id}>
                <div>
                  <strong>{evidence.vagueLabel || `证据${index + 1}`}</strong>
                  <span>{isRevealed ? '已核实' : isDiscovered ? evidence.discoveryLabel || evidence.title : '尚未触发'}</span>
                </div>
                {isDiscovered && !isRevealed && (
                  <button className="quote-button" type="button" onClick={() => onRevealEvidence(evidence.id)}>
                    <Search />
                    核实
                  </button>
                )}
              </div>
            )
          })
        ) : (
          <p className="empty-log">关键证据已全部公开。</p>
        )}
      </section>
    </>
  )
}

function EvidenceNoticeModal({
  evidence,
  onClose,
  onOpenDossier,
}: {
  evidence: EvidenceDefinition[]
  onClose: () => void
  onOpenDossier: () => void
}) {
  return (
    <div className="evidence-notice-backdrop" role="presentation">
      <section className="evidence-notice-modal" role="dialog" aria-modal="true" aria-labelledby="evidence-notice-title">
        <div className="evidence-notice-seal">
          <Search />
        </div>
        <p className="section-label">关键线索触发</p>
        <h2 id="evidence-notice-title">发现新的重要证据方向</h2>
        <p>刚才的盘问已经触发可核实的关键证据线索。你可以到案情档案里请老周进一步核实。</p>
        <div className="evidence-notice-list">
          {evidence.map((item, index) => (
            <span key={item.id}>{item.vagueLabel || `证据${index + 1}`}</span>
          ))}
        </div>
        <div className="evidence-notice-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            稍后查看
          </button>
          <button className="primary-button" type="button" onClick={onOpenDossier}>
            打开案情档案
          </button>
        </div>
      </section>
    </div>
  )
}

function playEvidenceNoticeSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext

  if (!AudioContextClass) {
    return
  }

  try {
    const audioContext = new AudioContextClass()
    const gain = audioContext.createGain()
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.38)
    gain.connect(audioContext.destination)

    ;[660, 880].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + index * 0.11)
      oscillator.connect(gain)
      oscillator.start(audioContext.currentTime + index * 0.11)
      oscillator.stop(audioContext.currentTime + index * 0.11 + 0.18)
    })

    window.setTimeout(() => void audioContext.close(), 520)
  } catch {
    // Audio feedback is decorative; the modal remains the reliable notification.
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

function StructuredSummaryView({ summary }: { summary: AI2StructuredSummary }) {
  return (
    <div className="structured-summary">
      <SummaryBlock title="时间线" items={summary.timeline} />
      <SummaryBlock title="矛盾点" items={summary.contradictions} />
      <SummaryBlock title="嫌疑点" items={summary.suspicions} />
      <SummaryBlock title="线索缺口" items={summary.clueGaps} />
    </div>
  )
}

function SummaryBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="summary-block">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ol>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ) : (
        <p>暂无</p>
      )}
    </section>
  )
}

function QuotePreview({ quote }: { quote: { speakerId: string; content: string } }) {
  return (
    <blockquote className="quote-preview">
      <strong>{speakerName(quote.speakerId)}</strong>
      <span>{quote.content.length > 90 ? `${quote.content.slice(0, 90)}...` : quote.content}</span>
    </blockquote>
  )
}

function ScoreItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="score-item">
      <span>{label}</span>
      <strong>{ok ? '正确' : '偏差'}</strong>
    </div>
  )
}

function speakerName(id: string) {
  if (id === 'player') {
    return '你'
  }
  if (id === 'ai2') {
    return '线索研判'
  }

  return demoCase.characters.find((character) => character.id === id)?.name || id
}

function turnClassName(turn: ConversationTurn) {
  return ['turn', turn.speakerId === 'player' ? 'player-turn' : '', turn.speakerId === 'ai2' ? 'ai2-turn' : '']
    .filter(Boolean)
    .join(' ')
}

function roundtableCharacterClassName(id: string, isActive: boolean, isPolice: boolean) {
  return ['stage-character', `stage-character-${id}`, isActive ? 'active' : '', isPolice ? 'police' : '']
    .filter(Boolean)
    .join(' ')
}

export default App
