import {
  Brain,
  ClipboardCheck,
  FileText,
  Gavel,
  MapPin,
  MessageSquareText,
  Users,
  Quote,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Terminal,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { requestAI } from './game/aiClient'
import { demoCase, playableCharacters } from './game/cases'
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
  const activeCharacter = playableCharacters.find((character) => character.id === activeCharacterId) || playableCharacters[0]
  const transcriptRef = useRef<HTMLDivElement | null>(null)

  const visibleTurns = useMemo(() => turns, [turns])
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
          discoverEvidence(parseTriggeredEvidenceIds(checkResponse.content, lockedEvidence.map((evidence) => evidence.id)))
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
        summaryContent = `【AI2整理失败】\nDeepSeek 没有返回可解析的四块 JSON。\n\n原始内容：\n${response.content}\n\n错误：${error instanceof Error ? error.message : String(error)}`
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
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyeline">TruthRound MVP</p>
          <h1>真相圆桌</h1>
        </div>
        <div className="topbar-actions">
          <div className="status-pill">
            <ShieldCheck data-icon="inline-start" />
            DeepSeek
          </div>
          <button className="ghost-button" type="button" onClick={resetGame}>
            <RotateCcw data-icon="inline-start" />
            重开
          </button>
        </div>
      </header>

      {phase === 'report' && (
        <section className="report-layout">
          <div className="briefing">
            <p className="section-label">街坊报案</p>
            <h2>{demoCase.title}</h2>
            <p>{demoCase.incidentSummary}</p>
            <section className="briefing-card reporter-card">
              <div className="card-title-row">
                <Gavel />
                <div>
                  <span>报案人</span>
                  <strong>{demoCase.reporter.name}</strong>
                </div>
              </div>
              <p>{demoCase.reporter.identity}</p>
              <p>{demoCase.reporter.concern}</p>
              <blockquote>{demoCase.reporter.statement}</blockquote>
            </section>
            <div className="police-note">
              <Gavel />
              <span>老周负责传唤、控场、记录；他不会推理，也不会替你找答案。</span>
            </div>
            <button className="primary-button" type="button" onClick={startRoundtable}>
              <MessageSquareText data-icon="inline-start" />
              开始圆桌盘问
            </button>
          </div>
          <aside className="case-panel opening-dossier">
            <section>
              <div className="dossier-heading">
                <Users />
                <div>
                  <p className="section-label">涉及人员</p>
                  <h3>老周请到圆桌的人</h3>
                </div>
              </div>
              <div className="party-list">
                {demoCase.involvedParties.map((party) => (
                  <InvolvedPartyRow party={party} key={party.characterId} />
                ))}
              </div>
            </section>
            <section>
              <div className="dossier-heading">
                <MapPin />
                <div>
                  <p className="section-label">老周开局证据</p>
                  <h3>已经确认的客观事实</h3>
                </div>
              </div>
              {revealedEvidence.map((evidence) => (
                <EvidenceRow evidence={evidence} key={evidence.id} />
              ))}
            </section>
          </aside>
        </section>
      )}

      {phase === 'roundtable' && (
        <section className="play-layout">
          <aside className="suspect-rail">
            <p className="section-label">圆桌人员</p>
            {playableCharacters.map((character) => (
              <button
                className={character.id === activeCharacterId ? 'suspect-card active' : 'suspect-card'}
                key={character.id}
                type="button"
                onClick={() => setActiveCharacter(character.id)}
              >
                <strong>{character.name}</strong>
                <span>{character.publicBackground}</span>
              </button>
            ))}
          </aside>

          <section className="dialogue-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">当前盘问</p>
                <h2>{activeCharacter.name}</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => setPhase('verdict')}>
                <ClipboardCheck data-icon="inline-start" />
                去裁决
              </button>
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

          <aside className="assistant-panel">
            <p className="section-label">AI2 复盘官</p>
            <h2>整理迷雾，不揭答案</h2>
            <button className="secondary-button" type="button" disabled={isThinking} onClick={askAssistant}>
              <Brain data-icon="inline-start" />
              让AI2整理
            </button>
            <section className="evidence-dossier">
              <h3>已确认事实</h3>
              {revealedEvidence.map((evidence) => (
                <EvidenceRow evidence={evidence} key={evidence.id} compact />
              ))}
            </section>
            <section className="evidence-dossier">
              <h3>可申请核实</h3>
              {unlockableEvidence.length > 0 ? (
                unlockableEvidence.map((evidence, index) => {
                  const isRevealed = revealedEvidenceIds.includes(evidence.id)
                  const isDiscovered = discoveredEvidenceIds.includes(evidence.id)

                  return (
                    <div className={isDiscovered || isRevealed ? 'unlock-row discovered' : 'unlock-row'} key={evidence.id}>
                      <div>
                        <strong>{evidence.vagueLabel || `证据${index + 1}`}</strong>
                        <span>
                          {isRevealed
                            ? '已核实'
                            : isDiscovered
                              ? evidence.discoveryLabel || evidence.title
                              : '待发现'}
                        </span>
                      </div>
                      {isDiscovered && !isRevealed && (
                        <button className="quote-button" type="button" onClick={() => revealEvidence(evidence.id)}>
                          <Search />
                          核实
                        </button>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="empty-log">可核实证据已全部公开。</p>
              )}
            </section>
            {latestStructuredSummary ? (
              <StructuredSummaryView summary={latestStructuredSummary} />
            ) : (
              <pre className="summary-output">{latestSummary || '每轮盘问后，可以让 AI2 固定汇总时间线、矛盾点、嫌疑点、线索缺口。它知道真相，但不能直接告诉你答案。'}</pre>
            )}
          </aside>
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
            <p className="empty-log">还没有接口记录。触发一次追问或AI2整理后，这里会显示请求和响应。</p>
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

function InvolvedPartyRow({ party }: { party: { characterId: string; relationship: string; summonsReason: string } }) {
  const character = demoCase.characters.find((item) => item.id === party.characterId)

  return (
    <article className="party-row">
      <strong>{character?.name || party.characterId}</strong>
      <p>{party.relationship}</p>
      <span>{party.summonsReason}</span>
    </article>
  )
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
    return 'AI2 复盘官'
  }

  return demoCase.characters.find((character) => character.id === id)?.name || id
}

function turnClassName(turn: ConversationTurn) {
  return ['turn', turn.speakerId === 'player' ? 'player-turn' : '', turn.speakerId === 'ai2' ? 'ai2-turn' : '']
    .filter(Boolean)
    .join(' ')
}

export default App
