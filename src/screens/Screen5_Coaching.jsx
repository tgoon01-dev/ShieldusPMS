import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { chatWithMember, analyzeFeedback } from '../api/claude'

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

export default function Screen5_Coaching({ onBack }) {
  const { getProfile, getGoals, addCoachingSession, updateCoachingSession } = useStore()
  const profile = getProfile()
  const goals = getGoals()

  const [step, setStep] = useState('situation-type') // situation-type | setup | chat | feedback
  const [situationType, setSituationType] = useState(null)
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [situation, setSituation] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [feedback, setFeedback] = useState(null)
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
    setSituation('')
    setStep('setup')
  }

  const canStartChat = selectedAssignee && situation.trim()

  const handleStartChat = () => {
    if (!canStartChat) return
    const id = Date.now().toString()
    setSessionId(id)
    const fullSituation = `[${selectedSituationType.title}] ${situation}`
    addCoachingSession({
      id,
      situation: fullSituation,
      goalTitle: selectedGoal?.kpi?.title || null,
      assigneeName: selectedAssignee,
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
        selectedAssignee, getKpiInfo()
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
    setSituation('')
    setMessages([])
    setInput('')
    setFeedback(null)
    setSessionId(null)
  }

  // ── Step 1: 상황 유형 선택 ──────────────────────────────────
  if (step === 'situation-type') {
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
        </div>
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
            📋 상황: {situation}
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
  situationBanner: { padding: '10px 20px', borderBottom: '1px solid', fontSize: '13px' },
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
