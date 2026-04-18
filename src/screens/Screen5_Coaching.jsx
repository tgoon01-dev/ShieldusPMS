import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { chatWithMember, analyzeFeedback } from '../api/claude'

const TRAITS = {
  positive: ['주도적인', '수용적인', '헌신적인', '치밀한', '유연한', '일관된', '논리적인', '낙천적인', '겸손한', '대담한'],
  challenging: ['수동적인', '방어적인', '냉소적인', '산만한', '독단적인', '충동적인', '기회주의적인', '위축된', '고지식한', '예민한'],
}

const SITUATION_TYPES = [
  {
    id: 'goal-setting',
    title: '목표 설정 면담',
    desc: 'KPI 수립 과정에서의 협의 및 동기부여',
    icon: '🎯',
    color: '#4299e1',
    bgColor: '#ebf8ff',
    examples: [
      '"팀원이 목표가 너무 높다고 불만을 표시하는 상황"',
      '"KPI 측정 방법에 대해 이견이 있는 상황"',
      '"목표 설정에 소극적으로 참여하는 상황"',
    ],
  },
  {
    id: 'mid-review',
    title: '중간 관리 면담',
    desc: '달성 현황 점검 및 개선 방향 논의',
    icon: '📊',
    color: '#48bb78',
    bgColor: '#f0fff4',
    examples: [
      '"달성률 60%로 저조하지만 원인을 모르는 것 같음"',
      '"업무 과부하로 번아웃 징후가 보임"',
      '"팀원 간 갈등으로 협업이 어려운 상황"',
    ],
  },
  {
    id: 'evaluation',
    title: '평가 면담',
    desc: '연간 성과 평가 결과 전달 및 피드백',
    icon: '⭐',
    color: '#9f7aea',
    bgColor: '#faf5ff',
    examples: [
      '"B 등급을 받았는데 본인은 A를 기대하던 상황"',
      '"평가 결과에 대해 납득하지 못하는 상황"',
      '"좋은 평가 결과를 받은 팀원과 성장 방향 논의"',
    ],
  },
  {
    id: 'objection',
    title: '이의제기 상황',
    desc: '평가 결과에 대한 공식적 이의 제기 대응',
    icon: '⚠️',
    color: '#e53e3e',
    bgColor: '#fff5f5',
    examples: [
      '"팀원이 강하게 등급 조정을 요구하는 상황"',
      '"타 팀원과의 형평성 문제를 제기하는 상황"',
      '"평가 기준 자체에 문제가 있다고 주장하는 상황"',
    ],
  },
]

function SessionDetailModal({ session, onClose }) {
  const typeInfo = SITUATION_TYPES.find(t => t.id === session.situationTypeId)
  const dateStr = session.date
    ? new Date(session.date).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '날짜 미기록'
  const fb = session.feedback
  const situationLabel = session.situation?.replace(/^\[.*?\]\s*/, '') || ''

  return (
    <div style={modal.overlay} onClick={onClose}>
      <div style={modal.box} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={modal.header}>
          <div style={modal.headerLeft}>
            <span style={{ ...modal.typeBadge, background: typeInfo?.bgColor || '#f7fafc', color: typeInfo?.color || '#718096' }}>
              {typeInfo?.icon} {typeInfo?.title || '면담'}
            </span>
            <div style={modal.headerTitle}>{session.assigneeName || '담당자 미기록'}</div>
            <div style={modal.headerMeta}>{dateStr}</div>
          </div>
          <button style={modal.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={modal.body}>
          {/* 면담 기본 정보 */}
          <div style={modal.infoRow}>
            {situationLabel && <div style={modal.infoItem}><span style={modal.infoLabel}>상황</span>{situationLabel}</div>}
            {session.goalTitle && <div style={modal.infoItem}><span style={modal.infoLabel}>KPI</span>{session.goalTitle}</div>}
            {session.traits?.length > 0 && (
              <div style={modal.infoItem}>
                <span style={modal.infoLabel}>성향</span>
                <span style={modal.traitsWrap}>
                  {session.traits.map(t => <span key={t} style={modal.traitChip}>{t}</span>)}
                </span>
              </div>
            )}
          </div>

          {/* 대화 흐름 */}
          {session.messages?.length > 0 && (
            <div style={modal.section}>
              <div style={modal.sectionTitle}>💬 면담 대화 흐름</div>
              <div style={modal.chatLog}>
                {session.messages.map((msg, i) => (
                  <div key={i} style={{ ...modal.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ ...modal.avatar, background: typeInfo?.color || '#a0aec0' }}>
                        {session.assigneeName?.charAt(0) || '?'}
                      </div>
                    )}
                    <div style={{ ...modal.bubble, ...(msg.role === 'user' ? modal.userBubble : modal.memberBubble) }}>
                      {msg.content}
                    </div>
                    {msg.role === 'user' && <div style={modal.meAvatar}>나</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 피드백 결과 */}
          {fb && (
            <div style={modal.section}>
              <div style={modal.sectionTitle}>📝 면담 피드백 결과</div>
              <div style={modal.overallBox}>{fb.overallComment}</div>
              <div style={modal.fbGrid}>
                <div style={{ ...modal.fbCard, borderTop: '3px solid #48bb78' }}>
                  <div style={modal.fbCardTitle}>✅ 잘한 점</div>
                  {fb.strengths?.map((s, i) => (
                    <div key={i} style={modal.fbItem}><span style={modal.fbNum}>{i+1}</span>{s}</div>
                  ))}
                </div>
                <div style={{ ...modal.fbCard, borderTop: '3px solid #fc8181' }}>
                  <div style={modal.fbCardTitle}>💡 개선 방안</div>
                  {fb.improvements?.map((s, i) => (
                    <div key={i} style={modal.fbItem}><span style={modal.fbNum}>{i+1}</span>{s}</div>
                  ))}
                </div>
              </div>
              {fb.tipForNext && (
                <div style={modal.tipBox}>
                  <span style={modal.tipLabel}>🎯 핵심 조언</span> {fb.tipForNext}
                </div>
              )}
            </div>
          )}

          {!fb && session.messages?.length > 0 && (
            <div style={modal.noFeedback}>면담 종료 후 피드백 분석을 받지 않은 세션입니다.</div>
          )}
          {(!session.messages || session.messages.length === 0) && (
            <div style={modal.noFeedback}>대화 기록이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Screen5_Coaching({ onBack }) {
  const { getProfile, getGoals, getCoachingSessions, addCoachingSession, updateCoachingSession } = useStore()
  const profile = getProfile()
  const goals = getGoals()
  const sessions = getCoachingSessions()

  const [step, setStep] = useState('situation-type') // situation-type | setup | chat | feedback
  const [situationType, setSituationType] = useState(null)
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [selectedTraits, setSelectedTraits] = useState([])
  const [situation, setSituation] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [viewSession, setViewSession] = useState(null) // 팝업으로 볼 세션
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 전체 담당자 목록 (중복 제거)
  const allAssignees = [...new Set(goals.flatMap(g => g.assignees || []))]
  const selectedGoal = goals.find(g => g.id === selectedGoalId)
  const selectedSituationType = SITUATION_TYPES.find(s => s.id === situationType)

  const handleSelectSituationType = (typeId) => {
    setSituationType(typeId)
    setSelectedGoalId('')
    setSelectedAssignee('')
    setSelectedTraits([])
    setSituation('')
    setStep('setup')
  }

  const toggleTrait = (trait) => {
    setSelectedTraits(prev =>
      prev.includes(trait) ? prev.filter(t => t !== trait) : [...prev, trait]
    )
  }

  const canStartChat = selectedAssignee && situation.trim()

  const handleStartChat = () => {
    if (!canStartChat) return
    const id = Date.now().toString()
    setSessionId(id)
    const fullSituation = `[${selectedSituationType.title}] ${situation}`
    addCoachingSession({
      id,
      date: new Date().toISOString(),
      situationTypeId: situationType,
      situation: fullSituation,
      goalTitle: selectedGoal?.kpi?.title || null,
      assigneeName: selectedAssignee,
      traits: selectedTraits,
      messages: [],
      feedback: null,
    })
    setStep('chat')
  }

  const getKpiInfo = () => {
    if (!selectedGoal) return null
    return {
      title: selectedGoal.kpi.title,
      targetValue: selectedGoal.kpi.targetValue,
      unit: selectedGoal.kpi.unit,
      currentValue: selectedGoal.currentValue,
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const fullSituation = `[${selectedSituationType.title}] ${situation}`
      const response = await chatWithMember(
        newMessages, fullSituation, profile.business, profile.department,
        selectedAssignee, getKpiInfo(), selectedTraits
      )
      const assistantMsg = { role: 'assistant', content: response }
      const finalMessages = [...newMessages, assistantMsg]
      setMessages(finalMessages)
      updateCoachingSession(sessionId, { messages: finalMessages })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleEndInterview = async () => {
    if (messages.length < 4) {
      alert('면담을 조금 더 진행한 후 종료해주세요.')
      return
    }
    setLoading(true)
    try {
      const fullSituation = `[${selectedSituationType.title}] ${situation}`
      const result = await analyzeFeedback(messages, fullSituation, profile.business, profile.department)
      setFeedback(result)
      updateCoachingSession(sessionId, { feedback: result })
      setStep('feedback')
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleRestart = () => {
    setStep('situation-type')
    setSituationType(null)
    setSelectedGoalId('')
    setSelectedAssignee('')
    setSelectedTraits([])
    setSituation('')
    setMessages([])
    setInput('')
    setFeedback(null)
    setSessionId(null)
  }

  // ── Step 1: 상황 유형 선택 ──────────────────────────────────
  if (step === 'situation-type') {
    const sortedSessions = [...sessions].sort((a, b) =>
      (b.date || b.id) > (a.date || a.id) ? 1 : -1
    )
    return (
      <div style={styles.bg}>
        <div style={styles.container}>
          <div style={styles.header}>
            <button style={styles.backBtn} onClick={onBack}>← 뒤로</button>
            <div>
              <h1 style={styles.title}>💬 코칭/피드백 시뮬레이션</h1>
              <div style={styles.sub}>어떤 면담 상황을 연습하시겠어요?</div>
            </div>
            <div />
          </div>

          <div style={styles.typeGrid}>
            {SITUATION_TYPES.map(type => (
              <button
                key={type.id}
                style={{ ...styles.typeCard, borderColor: type.color + '40' }}
                onClick={() => handleSelectSituationType(type.id)}
              >
                <div style={{ ...styles.typeIcon, background: type.bgColor, color: type.color }}>
                  {type.icon}
                </div>
                <div style={{ ...styles.typeTitle, color: type.color }}>{type.title}</div>
                <div style={styles.typeDesc}>{type.desc}</div>
                <div style={{ ...styles.typeArrow, color: type.color }}>시작하기 →</div>
              </button>
            ))}
          </div>

          {/* 면담 기록 타임라인 */}
          {sortedSessions.length > 0 && (
            <div style={styles.timelineCard}>
              <div style={styles.timelineHeader}>
                <div style={styles.timelineTitle}>📋 면담 기록</div>
                <div style={styles.timelineCount}>{sortedSessions.length}건</div>
              </div>
              <div style={styles.timelineList}>
                {sortedSessions.map((s, idx) => {
                  const typeInfo = SITUATION_TYPES.find(t => t.id === s.situationTypeId)
                  const dateStr = s.date
                    ? new Date(s.date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
                    : '날짜 미기록'
                  const timeStr = s.date
                    ? new Date(s.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                    : ''
                  const hasFeedback = !!s.feedback
                  return (
                    <div key={s.id} style={styles.tlItem} onClick={() => setViewSession(s)}>
                      <div style={styles.tlLeft}>
                        <div style={{ ...styles.tlTypeDot, background: typeInfo?.color || '#a0aec0' }} />
                        {idx < sortedSessions.length - 1 && <div style={styles.tlConnector} />}
                      </div>
                      <div style={styles.tlBody}>
                        <div style={styles.tlTopRow}>
                          <span style={{ ...styles.tlTypeBadge, background: typeInfo?.bgColor || '#f7fafc', color: typeInfo?.color || '#718096' }}>
                            {typeInfo?.icon} {typeInfo?.title || '면담'}
                          </span>
                          {hasFeedback && <span style={styles.tlFeedbackBadge}>✅ 피드백 완료</span>}
                        </div>
                        <div style={styles.tlAssignee}>{s.assigneeName || '담당자 미기록'}</div>
                        {s.traits?.length > 0 && (
                          <div style={styles.tlTraits}>
                            {s.traits.slice(0, 3).map(t => (
                              <span key={t} style={styles.tlTrait}>{t}</span>
                            ))}
                            {s.traits.length > 3 && <span style={styles.tlTrait}>+{s.traits.length - 3}</span>}
                          </div>
                        )}
                        <div style={styles.tlMeta}>
                          {dateStr} {timeStr} · {s.messages?.length || 0}개 메시지
                        </div>
                      </div>
                      <div style={styles.tlArrow}>›</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 세션 상세 팝업 */}
        {viewSession && (
          <SessionDetailModal session={viewSession} onClose={() => setViewSession(null)} />
        )}
      </div>
    )
  }

  // ── Step 2: 상황 설정 ──────────────────────────────────────
  if (step === 'setup') {
    return (
      <div style={styles.bg}>
        <div style={styles.container}>
          <div style={styles.header}>
            <button style={styles.backBtn} onClick={() => setStep('situation-type')}>← 뒤로</button>
            <div>
              <h1 style={styles.title}>💬 코칭/피드백 시뮬레이션</h1>
              <div style={styles.sub}>
                <span style={{ ...styles.typeBadge, background: selectedSituationType.bgColor, color: selectedSituationType.color }}>
                  {selectedSituationType.icon} {selectedSituationType.title}
                </span>
              </div>
            </div>
            <div />
          </div>

          <div style={styles.setupCard}>
            {/* KPI 선택 (선택사항) */}
            {goals.length > 0 && (
              <div style={styles.fieldGroup}>
                <div style={styles.fieldLabel}>관련 KPI 선택 <span style={styles.optional}>(선택사항)</span></div>
                <div style={styles.goalCards}>
                  {goals.map((g, i) => (
                    <button
                      key={g.id}
                      style={{
                        ...styles.goalCard,
                        borderColor: selectedGoalId === g.id ? selectedSituationType.color : '#e2e8f0',
                        background: selectedGoalId === g.id ? selectedSituationType.bgColor : 'white',
                      }}
                      onClick={() => setSelectedGoalId(selectedGoalId === g.id ? '' : g.id)}
                    >
                      <div style={styles.goalCardNum}>{i + 1}</div>
                      <div style={styles.goalCardContent}>
                        <div style={styles.goalCardTitle}>{g.kpi.title}</div>
                        <div style={styles.goalCardMeta}>
                          목표 {g.kpi.targetValue}{g.kpi.unit}
                          {g.currentValue !== null && g.currentValue !== undefined &&
                            ` · 현재 ${g.currentValue}${g.kpi.unit}`}
                        </div>
                      </div>
                      {selectedGoalId === g.id && (
                        <div style={{ ...styles.checkMark, color: selectedSituationType.color }}>✓</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 담당자 선택 */}
            <div style={styles.fieldGroup}>
              <div style={styles.fieldLabel}>면담할 구성원을 선택해주세요 <span style={styles.required}>*</span></div>
              {allAssignees.length === 0 ? (
                <div style={styles.emptyBox}>
                  목표 설정에서 담당자를 먼저 등록하거나, 아래에 이름을 직접 입력하세요.
                </div>
              ) : (
                <div style={styles.assigneeGrid}>
                  {allAssignees.map(name => (
                    <button
                      key={name}
                      style={{
                        ...styles.assigneeBtn,
                        borderColor: selectedAssignee === name ? selectedSituationType.color : '#e2e8f0',
                        background: selectedAssignee === name ? selectedSituationType.color : 'white',
                        color: selectedAssignee === name ? 'white' : '#4a5568',
                      }}
                      onClick={() => setSelectedAssignee(name)}
                    >
                      <div style={styles.assigneeIcon}>{name.charAt(0)}</div>
                      <div style={styles.assigneeName}>{name}</div>
                    </button>
                  ))}
                </div>
              )}
              <input
                style={styles.nameInput}
                placeholder="또는 이름 직접 입력..."
                value={allAssignees.includes(selectedAssignee) ? '' : selectedAssignee}
                onChange={e => setSelectedAssignee(e.target.value)}
              />
            </div>

            {/* 성향 선택 */}
            <div style={styles.fieldGroup}>
              <div style={styles.fieldLabel}>
                구성원 성향 선택 <span style={styles.optional}>(복수 선택 가능)</span>
                {selectedTraits.length > 0 && (
                  <span style={{ ...styles.optional, color: selectedSituationType.color, fontWeight: 700 }}>
                    {' '}· {selectedTraits.length}개 선택됨
                  </span>
                )}
              </div>
              <div style={styles.traitGroup}>
                <div style={styles.traitGroupLabel}>✅ 강점 성향</div>
                <div style={styles.traitRow}>
                  {TRAITS.positive.map(trait => (
                    <button
                      key={trait}
                      style={{
                        ...styles.traitChip,
                        background: selectedTraits.includes(trait) ? '#4299e1' : '#ebf8ff',
                        color: selectedTraits.includes(trait) ? 'white' : '#2b6cb0',
                        borderColor: selectedTraits.includes(trait) ? '#4299e1' : '#bee3f8',
                        fontWeight: selectedTraits.includes(trait) ? 700 : 500,
                      }}
                      onClick={() => toggleTrait(trait)}
                    >
                      {trait}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ ...styles.traitGroup, marginTop: '10px' }}>
                <div style={styles.traitGroupLabel}>⚠️ 도전적 성향</div>
                <div style={styles.traitRow}>
                  {TRAITS.challenging.map(trait => (
                    <button
                      key={trait}
                      style={{
                        ...styles.traitChip,
                        background: selectedTraits.includes(trait) ? '#e53e3e' : '#fff5f5',
                        color: selectedTraits.includes(trait) ? 'white' : '#c53030',
                        borderColor: selectedTraits.includes(trait) ? '#e53e3e' : '#feb2b2',
                        fontWeight: selectedTraits.includes(trait) ? 700 : 500,
                      }}
                      onClick={() => toggleTrait(trait)}
                    >
                      {trait}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 구체적 상황 입력 */}
            <div style={styles.fieldGroup}>
              <div style={styles.fieldLabel}>구체적인 상황을 입력해주세요 <span style={styles.required}>*</span></div>
              <div style={styles.exampleBox}>
                <div style={styles.exampleTitle}>입력 예시</div>
                {selectedSituationType.examples.map((ex, i) => (
                  <div key={i} style={styles.exampleItem}>• {ex}</div>
                ))}
              </div>
              <textarea
                style={styles.situationInput}
                placeholder={`${selectedSituationType.title} 상황을 구체적으로 입력해주세요...`}
                value={situation}
                onChange={e => setSituation(e.target.value)}
                rows={4}
              />
            </div>

            <button
              style={{
                ...styles.nextBtn,
                background: canStartChat ? selectedSituationType.color : '#cbd5e0',
                opacity: canStartChat ? 1 : 0.6,
                cursor: canStartChat ? 'pointer' : 'not-allowed',
              }}
              onClick={handleStartChat}
              disabled={!canStartChat}
            >
              면담 시작하기 →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: 채팅 ───────────────────────────────────────────
  if (step === 'chat') {
    return (
      <div style={styles.chatBg}>
        <div style={styles.chatContainer}>
          <div style={styles.chatHeader}>
            <div>
              <div style={styles.chatTitle}>
                {selectedSituationType.icon} {selectedAssignee}과(와) {selectedSituationType.title}
              </div>
              <div style={styles.chatSub}>
                {selectedGoal ? `${selectedGoal.kpi.title} · ` : ''}{profile.department}
              </div>
            </div>
            <button
              style={{ ...styles.endBtn, opacity: loading ? 0.5 : 1 }}
              onClick={handleEndInterview}
              disabled={loading}
            >
              {loading ? '⏳ 분석 중...' : '면담 종료 및 피드백'}
            </button>
          </div>

          <div style={{ ...styles.situationBanner, background: selectedSituationType.bgColor, borderColor: selectedSituationType.color + '40', color: '#2d3748' }}>
            <div>📋 상황: {situation}</div>
            {selectedTraits.length > 0 && (
              <div style={styles.traitBanner}>
                🧠 성향: {selectedTraits.map((t, i) => (
                  <span key={t} style={{
                    ...styles.traitBannerChip,
                    background: TRAITS.positive.includes(t) ? '#bee3f8' : '#fed7d7',
                    color: TRAITS.positive.includes(t) ? '#2b6cb0' : '#c53030',
                  }}>{t}</span>
                ))}
              </div>
            )}
          </div>

          <div style={styles.chatArea}>
            {messages.length === 0 && (
              <div style={styles.startGuide}>
                <div style={{ ...styles.avatarLarge, background: selectedSituationType.color }}>
                  {selectedAssignee.charAt(0)}
                </div>
                <div style={styles.startGuideText}>
                  {selectedAssignee}과(와) {selectedSituationType.title}을 시작해주세요
                </div>
                <div style={styles.startGuideHint}>
                  팀장으로서 먼저 말씀을 시작하면 AI가 {selectedAssignee} 역할로 응답합니다
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ ...styles.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ ...styles.memberAvatar, background: selectedSituationType.color }}>
                    {selectedAssignee.charAt(0)}
                  </div>
                )}
                <div style={{
                  ...styles.bubble,
                  ...(msg.role === 'user' ? styles.userBubble : styles.memberBubble)
                }}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div style={styles.managerAvatar}>나</div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ ...styles.msgRow, justifyContent: 'flex-start' }}>
                <div style={{ ...styles.memberAvatar, background: selectedSituationType.color }}>
                  {selectedAssignee.charAt(0)}
                </div>
                <div style={{ ...styles.bubble, ...styles.memberBubble }}>
                  <span style={styles.typing}>● ● ●</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={styles.inputArea}>
            <textarea
              style={styles.chatInput}
              placeholder="팀장으로서 말할 내용을 입력하세요... (Shift+Enter 줄바꿈)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              rows={2}
            />
            <button
              style={{ ...styles.sendBtn, opacity: input.trim() && !loading ? 1 : 0.4 }}
              onClick={handleSendMessage}
              disabled={!input.trim() || loading}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 4: 피드백 ─────────────────────────────────────────
  if (step === 'feedback' && feedback) {
    return (
      <div style={styles.bg}>
        <div style={styles.container}>
          <div style={styles.header}>
            <button style={styles.backBtn} onClick={onBack}>← 뒤로</button>
            <div>
              <h1 style={styles.title}>📝 면담 피드백 결과</h1>
              <div style={styles.sub}>
                <span style={{ ...styles.typeBadge, background: selectedSituationType.bgColor, color: selectedSituationType.color }}>
                  {selectedSituationType.icon} {selectedSituationType.title}
                </span>
                {' · '}{selectedAssignee}
              </div>
            </div>
            <button style={styles.restartBtn} onClick={handleRestart}>새 면담 시작</button>
          </div>

          <div style={styles.overallCard}>
            <div style={styles.overallTitle}>종합 평가</div>
            <div style={styles.overallText}>{feedback.overallComment}</div>
          </div>

          <div style={styles.feedbackGrid}>
            <div style={{ ...styles.feedbackCard, borderTop: '4px solid #48bb78' }}>
              <div style={styles.feedbackTitle}>✅ 잘한 점</div>
              {feedback.strengths.map((s, i) => (
                <div key={i} style={styles.feedbackItem}>
                  <span style={styles.feedbackNum}>{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ ...styles.feedbackCard, borderTop: '4px solid #fc8181' }}>
              <div style={styles.feedbackTitle}>💡 아쉬운 점 & 개선 방안</div>
              {feedback.improvements.map((s, i) => (
                <div key={i} style={styles.feedbackItem}>
                  <span style={styles.feedbackNum}>{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.tipCard}>
            <div style={styles.tipTitle}>🎯 다음 면담을 위한 핵심 조언</div>
            <div style={styles.tipText}>{feedback.tipForNext}</div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

const styles = {
  bg: { minHeight: '100vh', background: '#f0f4f8', padding: '24px' },
  container: { maxWidth: '860px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  backBtn: { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#718096' },
  title: { fontSize: '22px', fontWeight: 800, margin: 0 },
  sub: { fontSize: '13px', color: '#718096', marginTop: '4px' },
  typeBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 },

  // 상황 유형 선택
  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  typeCard: { background: 'white', border: '2px solid', borderRadius: '16px', padding: '28px 24px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '10px' },
  typeIcon: { width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' },
  typeTitle: { fontSize: '18px', fontWeight: 800 },
  typeDesc: { fontSize: '13px', color: '#718096', lineHeight: 1.5, flex: 1 },
  typeArrow: { fontSize: '13px', fontWeight: 700, marginTop: '4px' },

  // 셋업
  setupCard: { background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  fieldGroup: { marginBottom: '28px' },
  fieldLabel: { fontSize: '15px', fontWeight: 700, color: '#2d3748', marginBottom: '12px' },
  required: { color: '#e53e3e', fontSize: '13px' },
  optional: { color: '#a0aec0', fontSize: '12px', fontWeight: 400 },
  emptyBox: { background: '#f7fafc', borderRadius: '10px', padding: '16px', color: '#718096', fontSize: '14px' },
  assigneeGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' },
  assigneeBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: '2px solid', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s' },
  assigneeIcon: { width: '32px', height: '32px', background: 'rgba(255,255,255,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 },
  assigneeName: { fontSize: '14px', fontWeight: 700 },
  nameInput: { width: '100%', padding: '10px 14px', border: '1px dashed #cbd5e0', borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#4a5568', boxSizing: 'border-box' },
  goalCards: { display: 'flex', flexDirection: 'column', gap: '8px' },
  goalCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: '2px solid', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' },
  goalCardNum: { width: '26px', height: '26px', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#718096', flexShrink: 0 },
  goalCardContent: { flex: 1 },
  goalCardTitle: { fontSize: '14px', fontWeight: 700, color: '#2d3748' },
  goalCardMeta: { fontSize: '12px', color: '#718096', marginTop: '2px' },
  checkMark: { fontSize: '18px', fontWeight: 900 },
  exampleBox: { background: '#f7fafc', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' },
  exampleTitle: { fontSize: '11px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', marginBottom: '8px' },
  exampleItem: { fontSize: '13px', color: '#4a5568', lineHeight: 1.8 },
  situationInput: { width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  nextBtn: { width: '100%', padding: '16px', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700 },

  // 채팅
  chatBg: { height: '100vh', background: '#f0f4f8', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' },
  chatContainer: { width: '100%', maxWidth: '800px', height: '100%', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' },
  chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f4f8' },
  chatTitle: { fontSize: '17px', fontWeight: 800 },
  chatSub: { fontSize: '12px', color: '#718096' },
  endBtn: { padding: '10px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
  situationBanner: { padding: '10px 20px', borderBottom: '1px solid', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' },
  traitBanner: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  traitBannerChip: { padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 },
  traitGroup: { background: '#f7fafc', borderRadius: '10px', padding: '12px 14px' },
  traitGroupLabel: { fontSize: '11px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' },
  traitRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  traitChip: { padding: '6px 12px', border: '1.5px solid', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s' },
  chatArea: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  startGuide: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', padding: '40px 20px' },
  avatarLarge: { width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 900, color: 'white' },
  startGuideText: { fontSize: '18px', fontWeight: 700, color: '#2d3748', textAlign: 'center' },
  startGuideHint: { fontSize: '13px', color: '#a0aec0', textAlign: 'center' },
  msgRow: { display: 'flex', gap: '10px', alignItems: 'flex-end' },
  bubble: { maxWidth: '70%', padding: '12px 16px', borderRadius: '16px', fontSize: '14px', lineHeight: 1.7 },
  userBubble: { background: '#4299e1', color: 'white', borderBottomRightRadius: '4px' },
  memberBubble: { background: '#f7fafc', color: '#2d3748', borderBottomLeftRadius: '4px', border: '1px solid #e2e8f0' },
  memberAvatar: { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white', flexShrink: 0 },
  managerAvatar: { width: '32px', height: '32px', background: '#4299e1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0 },
  typing: { color: '#a0aec0', letterSpacing: '3px' },
  inputArea: { display: 'flex', gap: '10px', padding: '14px 16px', borderTop: '1px solid #f0f4f8' },
  chatInput: { flex: 1, padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'inherit' },
  sendBtn: { padding: '10px 20px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-end' },

  // 타임라인
  timelineCard: { background: 'white', borderRadius: '16px', padding: '20px 24px', marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  timelineHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  timelineTitle: { fontSize: '15px', fontWeight: 800, color: '#2d3748', flex: 1 },
  timelineCount: { fontSize: '13px', color: '#a0aec0', fontWeight: 600 },
  timelineList: { display: 'flex', flexDirection: 'column' },
  tlItem: { display: 'flex', gap: '14px', cursor: 'pointer', padding: '10px 8px', borderRadius: '10px', transition: 'background 0.15s' },
  tlLeft: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12px', flexShrink: 0, paddingTop: '4px' },
  tlTypeDot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
  tlConnector: { flex: 1, width: '2px', background: '#e2e8f0', marginTop: '4px', minHeight: '24px' },
  tlBody: { flex: 1, paddingBottom: '14px' },
  tlTopRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' },
  tlTypeBadge: { padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 },
  tlFeedbackBadge: { fontSize: '11px', color: '#276749', background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: '10px', padding: '2px 8px' },
  tlAssignee: { fontSize: '14px', fontWeight: 700, color: '#2d3748', marginBottom: '4px' },
  tlTraits: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' },
  tlTrait: { fontSize: '11px', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1px 7px', color: '#718096' },
  tlMeta: { fontSize: '11px', color: '#a0aec0' },
  tlArrow: { fontSize: '20px', color: '#cbd5e0', alignSelf: 'center', flexShrink: 0 },

  // 피드백
  restartBtn: { padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#718096' },
  overallCard: { background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  overallTitle: { fontSize: '12px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', marginBottom: '10px' },
  overallText: { fontSize: '16px', color: '#2d3748', lineHeight: 1.7 },
  feedbackGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  feedbackCard: { background: 'white', borderRadius: '16px', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  feedbackTitle: { fontSize: '16px', fontWeight: 800, marginBottom: '16px' },
  feedbackItem: { display: 'flex', gap: '10px', marginBottom: '12px', fontSize: '13px', color: '#4a5568', lineHeight: 1.6, alignItems: 'flex-start' },
  feedbackNum: { width: '22px', height: '22px', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: '1px' },
  tipCard: { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(102,126,234,0.3)' },
  tipTitle: { fontSize: '12px', fontWeight: 700, opacity: 0.8, marginBottom: '10px', textTransform: 'uppercase' },
  tipText: { fontSize: '16px', lineHeight: 1.7 },
}

const modal = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' },
  box: { background: 'white', borderRadius: '20px', width: '100%', maxWidth: '680px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', marginTop: '20px', marginBottom: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 16px', borderBottom: '1px solid #f0f4f8' },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
  typeBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, alignSelf: 'flex-start' },
  headerTitle: { fontSize: '20px', fontWeight: 800, color: '#1a202c' },
  headerMeta: { fontSize: '12px', color: '#a0aec0' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#718096', padding: '4px', flexShrink: 0 },
  body: { padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: '20px' },
  infoRow: { background: '#f7fafc', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  infoItem: { display: 'flex', gap: '10px', fontSize: '13px', color: '#2d3748', alignItems: 'flex-start' },
  infoLabel: { fontWeight: 700, color: '#a0aec0', fontSize: '11px', textTransform: 'uppercase', width: '36px', flexShrink: 0, paddingTop: '1px' },
  traitsWrap: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  traitChip: { padding: '2px 8px', background: '#edf2f7', borderRadius: '10px', fontSize: '11px', color: '#4a5568' },
  section: { display: 'flex', flexDirection: 'column', gap: '12px' },
  sectionTitle: { fontSize: '14px', fontWeight: 800, color: '#2d3748' },
  chatLog: { maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', background: '#f7fafc', borderRadius: '10px' },
  msgRow: { display: 'flex', gap: '8px', alignItems: 'flex-end' },
  avatar: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'white', flexShrink: 0 },
  meAvatar: { width: '28px', height: '28px', borderRadius: '50%', background: '#4299e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white', flexShrink: 0 },
  bubble: { maxWidth: '75%', padding: '10px 14px', borderRadius: '14px', fontSize: '13px', lineHeight: 1.6 },
  userBubble: { background: '#4299e1', color: 'white', borderBottomRightRadius: '3px' },
  memberBubble: { background: 'white', color: '#2d3748', borderBottomLeftRadius: '3px', border: '1px solid #e2e8f0' },
  overallBox: { background: '#f0f4f8', borderRadius: '10px', padding: '14px 16px', fontSize: '14px', color: '#2d3748', lineHeight: 1.7 },
  fbGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  fbCard: { background: '#f7fafc', borderRadius: '10px', padding: '14px' },
  fbCardTitle: { fontSize: '13px', fontWeight: 800, marginBottom: '10px', color: '#2d3748' },
  fbItem: { display: 'flex', gap: '8px', fontSize: '12px', color: '#4a5568', lineHeight: 1.6, marginBottom: '8px', alignItems: 'flex-start' },
  fbNum: { width: '18px', height: '18px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 },
  tipBox: { background: 'linear-gradient(135deg, #667eea22, #764ba222)', border: '1px solid #764ba240', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: '#2d3748', lineHeight: 1.7 },
  tipLabel: { fontWeight: 800, color: '#764ba2' },
  noFeedback: { background: '#f7fafc', borderRadius: '10px', padding: '16px', textAlign: 'center', fontSize: '13px', color: '#a0aec0' },
}
