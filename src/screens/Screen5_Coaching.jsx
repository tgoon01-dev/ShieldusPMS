import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { chatWithMember, analyzeFeedback } from '../api/claude'

export default function Screen5_Coaching({ onBack }) {
  const { getProfile, getGoals, addCoachingSession, updateCoachingSession } = useStore()
  const profile = getProfile()
  const goals = getGoals()

  const [step, setStep] = useState('select') // select | situation | chat | feedback
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

  const selectedGoal = goals.find(g => g.id === selectedGoalId)
  const assigneesForGoal = selectedGoal?.assignees || []

  // Reset assignee when goal changes
  const handleGoalChange = (id) => {
    setSelectedGoalId(id)
    setSelectedAssignee('')
  }

  const canProceedToSituation = selectedGoalId && selectedAssignee

  const handleStartChat = () => {
    if (!situation.trim()) return
    const id = Date.now().toString()
    setSessionId(id)
    addCoachingSession({
      id,
      situation,
      goalTitle: selectedGoal?.kpi?.title,
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
      const response = await chatWithMember(
        newMessages, situation, profile.business, profile.department,
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
      const result = await analyzeFeedback(messages, situation, profile.business, profile.department)
      setFeedback(result)
      updateCoachingSession(sessionId, { feedback: result })
      setStep('feedback')
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleRestart = () => {
    setStep('select')
    setSelectedGoalId('')
    setSelectedAssignee('')
    setSituation('')
    setMessages([])
    setInput('')
    setFeedback(null)
    setSessionId(null)
  }

  // ── Step 1: 목표 & 담당자 선택 ──────────────────────────────
  if (step === 'select') {
    return (
      <div style={styles.bg}>
        <div style={styles.container}>
          <div style={styles.header}>
            <button style={styles.backBtn} onClick={onBack}>← 뒤로</button>
            <div>
              <h1 style={styles.title}>💬 코칭/피드백 시뮬레이션</h1>
              <div style={styles.sub}>면담 대상과 목표를 먼저 선택해주세요</div>
            </div>
            <div />
          </div>

          <div style={styles.setupCard}>
            <div style={styles.stepRow}>
              <div style={{ ...styles.stepBadge, background: '#ed8936' }}>STEP 1</div>
              <div style={styles.stepTitle}>면담 대상 선택</div>
            </div>

            {goals.length === 0 ? (
              <div style={styles.emptyBox}>
                목표 설정 화면에서 KPI와 담당자를 먼저 등록해주세요.
              </div>
            ) : (
              <>
                {/* 목표 선택 */}
                <div style={styles.fieldGroup}>
                  <div style={styles.fieldLabel}>어떤 목표에 대해 면담하시나요?</div>
                  <div style={styles.goalCards}>
                    {goals.map((g, i) => (
                      <button
                        key={g.id}
                        style={{
                          ...styles.goalCard,
                          borderColor: selectedGoalId === g.id ? '#ed8936' : '#e2e8f0',
                          background: selectedGoalId === g.id ? '#fffaf0' : 'white',
                        }}
                        onClick={() => handleGoalChange(g.id)}
                      >
                        <div style={styles.goalCardNum}>{i + 1}</div>
                        <div style={styles.goalCardContent}>
                          <div style={styles.goalCardTitle}>{g.kpi.title}</div>
                          <div style={styles.goalCardMeta}>
                            목표 {g.kpi.targetValue}{g.kpi.unit}
                            {g.currentValue !== null && g.currentValue !== undefined &&
                              ` · 현재 ${g.currentValue}${g.kpi.unit}`}
                            {g.assignees?.length > 0 && ` · 담당 ${g.assignees.join(', ')}`}
                          </div>
                        </div>
                        {selectedGoalId === g.id && <div style={styles.checkMark}>✓</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 담당자 선택 */}
                {selectedGoalId && (
                  <div style={styles.fieldGroup}>
                    <div style={styles.fieldLabel}>면담할 구성원을 선택해주세요</div>
                    {assigneesForGoal.length === 0 ? (
                      <div style={styles.noAssigneeBox}>
                        이 목표에 배정된 구성원이 없습니다. 목표 설정에서 담당자를 추가해주세요.
                      </div>
                    ) : (
                      <div style={styles.assigneeGrid}>
                        {assigneesForGoal.map(name => (
                          <button
                            key={name}
                            style={{
                              ...styles.assigneeBtn,
                              borderColor: selectedAssignee === name ? '#ed8936' : '#e2e8f0',
                              background: selectedAssignee === name ? '#ed8936' : 'white',
                              color: selectedAssignee === name ? 'white' : '#4a5568',
                            }}
                            onClick={() => setSelectedAssignee(name)}
                          >
                            <div style={styles.assigneeIcon}>
                              {name.charAt(0)}
                            </div>
                            <div style={styles.assigneeName}>{name}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 선택 요약 */}
                {selectedGoalId && selectedAssignee && (
                  <div style={styles.summaryBox}>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>면담 목표</span>
                      <span style={styles.summaryValue}>{selectedGoal?.kpi?.title}</span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>면담 대상</span>
                      <span style={{ ...styles.summaryValue, color: '#ed8936', fontWeight: 800 }}>{selectedAssignee}</span>
                    </div>
                  </div>
                )}

                <button
                  style={{ ...styles.nextBtn, opacity: canProceedToSituation ? 1 : 0.4 }}
                  onClick={() => canProceedToSituation && setStep('situation')}
                  disabled={!canProceedToSituation}
                >
                  다음: 상황 설정 →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: 상황 입력 ──────────────────────────────────────
  if (step === 'situation') {
    return (
      <div style={styles.bg}>
        <div style={styles.container}>
          <div style={styles.header}>
            <button style={styles.backBtn} onClick={() => setStep('select')}>← 뒤로</button>
            <div>
              <h1 style={styles.title}>💬 코칭/피드백 시뮬레이션</h1>
              <div style={styles.sub}>{selectedAssignee} · {selectedGoal?.kpi?.title}</div>
            </div>
            <div />
          </div>

          <div style={styles.setupCard}>
            <div style={styles.stepRow}>
              <div style={{ ...styles.stepBadge, background: '#ed8936' }}>STEP 2</div>
              <div style={styles.stepTitle}>면담 상황 설정</div>
            </div>

            <div style={styles.contextBox}>
              <div style={styles.contextRow}>
                <span style={styles.contextLabel}>면담 대상</span>
                <span style={styles.contextVal}>{selectedAssignee}</span>
              </div>
              <div style={styles.contextRow}>
                <span style={styles.contextLabel}>담당 KPI</span>
                <span style={styles.contextVal}>{selectedGoal?.kpi?.title}</span>
              </div>
              <div style={styles.contextRow}>
                <span style={styles.contextLabel}>목표</span>
                <span style={styles.contextVal}>
                  {selectedGoal?.kpi?.targetValue}{selectedGoal?.kpi?.unit}
                  {selectedGoal?.currentValue !== null && selectedGoal?.currentValue !== undefined &&
                    ` · 현재 ${selectedGoal.currentValue}${selectedGoal.kpi.unit} (달성률 ${Math.round(selectedGoal.currentValue / parseFloat(selectedGoal.kpi.targetValue) * 100)}%)`}
                </span>
              </div>
            </div>

            <div style={styles.exampleBox}>
              <div style={styles.exampleTitle}>입력 예시</div>
              <div style={styles.exampleItem}>• "목표 달성률이 60%로 저조하지만 원인을 모르는 것 같음. 최근 의욕이 떨어진 모습"</div>
              <div style={styles.exampleItem}>• "업무 과부하로 번아웃 징후가 보임. KPI 재조정이 필요할 것 같음"</div>
              <div style={styles.exampleItem}>• "팀원 간 갈등으로 협업이 안 되고 있어 성과에 영향을 미치고 있음"</div>
            </div>

            <textarea
              style={styles.situationInput}
              placeholder={`${selectedAssignee}의 현재 상황을 구체적으로 입력해주세요...`}
              value={situation}
              onChange={e => setSituation(e.target.value)}
              rows={5}
            />

            <button
              style={{ ...styles.nextBtn, opacity: situation.trim() ? 1 : 0.4, background: '#ed8936' }}
              onClick={handleStartChat}
              disabled={!situation.trim()}
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
                💬 {selectedAssignee}과(와) 성과 면담
              </div>
              <div style={styles.chatSub}>
                {selectedGoal?.kpi?.title} · {profile.department}
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

          <div style={styles.situationBanner}>
            📋 상황: {situation}
          </div>

          <div style={styles.chatArea}>
            {messages.length === 0 && (
              <div style={styles.startGuide}>
                <div style={styles.avatarLarge}>{selectedAssignee.charAt(0)}</div>
                <div style={styles.startGuideText}>
                  {selectedAssignee}과(와) 성과 면담을 시작해주십시오
                </div>
                <div style={styles.startGuideHint}>팀장으로서 먼저 말씀을 시작하면 AI가 {selectedAssignee} 역할로 응답합니다</div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ ...styles.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={styles.memberAvatar}>{selectedAssignee.charAt(0)}</div>
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
                <div style={styles.memberAvatar}>{selectedAssignee.charAt(0)}</div>
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
              <div style={styles.sub}>{selectedAssignee} · {selectedGoal?.kpi?.title}</div>
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
  container: { maxWidth: '800px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  backBtn: { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#718096' },
  title: { fontSize: '22px', fontWeight: 800 },
  sub: { fontSize: '13px', color: '#718096', marginTop: '2px' },
  setupCard: { background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  stepRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' },
  stepBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, color: 'white', letterSpacing: '0.5px' },
  stepTitle: { fontSize: '18px', fontWeight: 800, color: '#2d3748' },
  emptyBox: { background: '#f7fafc', borderRadius: '10px', padding: '20px', textAlign: 'center', color: '#718096', fontSize: '14px' },
  fieldGroup: { marginBottom: '24px' },
  fieldLabel: { fontSize: '14px', fontWeight: 700, color: '#4a5568', marginBottom: '12px' },
  goalCards: { display: 'flex', flexDirection: 'column', gap: '8px' },
  goalCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', border: '2px solid', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' },
  goalCardNum: { width: '28px', height: '28px', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#718096', flexShrink: 0 },
  goalCardContent: { flex: 1 },
  goalCardTitle: { fontSize: '14px', fontWeight: 700, color: '#2d3748' },
  goalCardMeta: { fontSize: '12px', color: '#718096', marginTop: '2px' },
  checkMark: { fontSize: '18px', color: '#ed8936', fontWeight: 900 },
  noAssigneeBox: { background: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#744210' },
  assigneeGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  assigneeBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: '2px solid', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s' },
  assigneeIcon: { width: '32px', height: '32px', background: 'rgba(255,255,255,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 },
  assigneeName: { fontSize: '14px', fontWeight: 700 },
  summaryBox: { background: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  summaryItem: { display: 'flex', gap: '12px', alignItems: 'center', fontSize: '14px' },
  summaryLabel: { color: '#a0aec0', fontWeight: 700, width: '70px', fontSize: '12px', textTransform: 'uppercase' },
  summaryValue: { color: '#2d3748', fontWeight: 600 },
  nextBtn: { width: '100%', padding: '16px', background: '#2d3748', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' },
  contextBox: { background: '#f7fafc', borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  contextRow: { display: 'flex', gap: '12px', fontSize: '13px', alignItems: 'flex-start' },
  contextLabel: { color: '#a0aec0', fontWeight: 700, width: '60px', fontSize: '11px', textTransform: 'uppercase', paddingTop: '1px', flexShrink: 0 },
  contextVal: { color: '#2d3748', fontWeight: 600, flex: 1 },
  exampleBox: { background: '#f7fafc', borderRadius: '10px', padding: '16px', marginBottom: '20px' },
  exampleTitle: { fontSize: '12px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', marginBottom: '10px' },
  exampleItem: { fontSize: '13px', color: '#4a5568', lineHeight: 1.8 },
  situationInput: { width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: '16px' },
  chatBg: { height: '100vh', background: '#f0f4f8', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' },
  chatContainer: { width: '100%', maxWidth: '800px', height: '100%', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' },
  chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f4f8' },
  chatTitle: { fontSize: '17px', fontWeight: 800 },
  chatSub: { fontSize: '12px', color: '#718096' },
  endBtn: { padding: '10px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
  situationBanner: { padding: '10px 20px', background: '#fffaf0', borderBottom: '1px solid #fbd38d', fontSize: '13px', color: '#744210' },
  chatArea: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  startGuide: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', padding: '40px 20px' },
  avatarLarge: { width: '64px', height: '64px', background: '#ed8936', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 900, color: 'white' },
  startGuideText: { fontSize: '18px', fontWeight: 700, color: '#2d3748', textAlign: 'center' },
  startGuideHint: { fontSize: '13px', color: '#a0aec0', textAlign: 'center' },
  msgRow: { display: 'flex', gap: '10px', alignItems: 'flex-end' },
  bubble: { maxWidth: '70%', padding: '12px 16px', borderRadius: '16px', fontSize: '14px', lineHeight: 1.7 },
  userBubble: { background: '#4299e1', color: 'white', borderBottomRightRadius: '4px' },
  memberBubble: { background: '#f7fafc', color: '#2d3748', borderBottomLeftRadius: '4px', border: '1px solid #e2e8f0' },
  memberAvatar: { width: '32px', height: '32px', background: '#ed8936', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white', flexShrink: 0 },
  managerAvatar: { width: '32px', height: '32px', background: '#4299e1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0 },
  typing: { color: '#a0aec0', letterSpacing: '3px' },
  inputArea: { display: 'flex', gap: '10px', padding: '14px 16px', borderTop: '1px solid #f0f4f8' },
  chatInput: { flex: 1, padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'inherit' },
  sendBtn: { padding: '10px 20px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-end' },
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
