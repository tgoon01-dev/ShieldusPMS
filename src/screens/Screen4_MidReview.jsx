import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useStore } from '../store'
import { generateImprovementAdvice } from '../api/claude'

const today = () => new Date().toISOString().slice(0, 10)

export default function Screen4_MidReview({ onBack }) {
  const { getGoals, getProfile, updateGoal } = useStore()
  const goals = getGoals()
  const profile = getProfile()

  const [selected, setSelected] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [inputDate, setInputDate] = useState(today())
  const [advice, setAdvice] = useState(null)
  const [loadingAdvice, setLoadingAdvice] = useState(false)
  const [adviceFeedback, setAdviceFeedback] = useState({})

  const hasFeedback = Object.keys(adviceFeedback).length > 0

  // 진행 이력 저장 (날짜 + 값)
  const handleSaveValue = () => {
    if (!selected || inputValue === '') return
    const val = parseFloat(inputValue)
    const newEntry = { id: Date.now().toString(), date: inputDate, value: val }
    const prevHistory = selected.progressHistory || []
    const updatedHistory = [...prevHistory, newEntry].sort((a, b) => a.date.localeCompare(b.date))
    const latestValue = updatedHistory[updatedHistory.length - 1].value
    updateGoal(selected.id, { progressHistory: updatedHistory, currentValue: latestValue })
    setSelected(null)
    setInputValue('')
    setInputDate(today())
  }

  // 이모지 피드백 + 좋아요 조언 저장
  const handleFeedback = (gapIndex, adviceIndex, value) => {
    const key = `${gapIndex}-${adviceIndex}`
    const prev = adviceFeedback[key]
    setAdviceFeedback(p => ({ ...p, [key]: prev === value ? undefined : value }))

    // 좋아요로 바뀌는 경우 goal에 저장
    if (value === 'good' && prev !== 'good' && advice?.[gapIndex]) {
      const gapItems = getGapItems()
      const goal = gapItems[gapIndex]
      if (!goal) return
      const text = adviceIndex === 0 ? advice[gapIndex].advice1 : advice[gapIndex].advice2
      const existing = goals.find(g => g.id === goal.id)
      const prevGood = existing?.goodAdvices || []
      if (!prevGood.some(a => a.text === text)) {
        updateGoal(goal.id, {
          goodAdvices: [...prevGood, { text, date: inputDate, kpiTitle: goal.kpi.title }]
        })
      }
    }
  }

  const allFilled = goals.length > 0 && goals.every(g => g.currentValue !== null && g.currentValue !== undefined)
  const hasAnyHistory = goals.some(g => (g.progressHistory || []).length > 0)
  const allGoodAdvices = goals.flatMap(g => (g.goodAdvices || []).map(a => ({ ...a, kpiTitle: a.kpiTitle || g.kpi.title })))

  const getGapItems = () => goals
    .filter(g => g.currentValue !== null)
    .map(g => {
      const target = parseFloat(g.kpi.targetValue) || 100
      const current = parseFloat(g.currentValue) || 0
      const rate = target > 0 ? (current / target) * 100 : 0
      return { ...g, achievementRate: rate, gap: target - current }
    })
    .sort((a, b) => a.achievementRate - b.achievementRate)
    .slice(0, 3)

  const handleGetAdvice = async (withFeedback = false) => {
    setLoadingAdvice(true)
    try {
      const result = await generateImprovementAdvice(
        getGapItems(), profile.business, profile.department,
        withFeedback ? advice : null,
        withFeedback ? adviceFeedback : null
      )
      setAdvice(result.advices)
      setAdviceFeedback({})
    } catch (e) { console.error(e) }
    setLoadingAdvice(false)
  }

  const getAchievementColor = (rate) => {
    if (rate >= 90) return '#48bb78'
    if (rate >= 70) return '#ed8936'
    return '#fc8181'
  }

  const chartData = goals.map(g => ({
    name: g.kpi.title.length > 10 ? g.kpi.title.slice(0, 10) + '…' : g.kpi.title,
    fullName: g.kpi.title,
    목표: parseFloat(g.kpi.targetValue) || 100,
    현재: g.currentValue !== null ? parseFloat(g.currentValue) : 0,
  }))

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>← 뒤로</button>
          <div>
            <h1 style={styles.title}>📊 중간 관리</h1>
            <div style={styles.sub}>달성 현황을 기록하고 추이를 확인하세요</div>
          </div>
          <div style={styles.progressInfo}>
            {goals.filter(g => g.currentValue !== null).length}/{goals.length} 입력 완료
          </div>
        </div>

        {/* KPI 목록 */}
        <div style={styles.kpiCard}>
          <div style={styles.sectionTitle}>KPI 목록 — 항목을 클릭하여 달성 현황 기록</div>
          {goals.map((goal, i) => {
            const target = parseFloat(goal.kpi.targetValue) || 100
            const current = goal.currentValue !== null && goal.currentValue !== undefined ? parseFloat(goal.currentValue) : null
            const rate = current !== null ? (current / target) * 100 : null
            const historyCount = (goal.progressHistory || []).length
            return (
              <div key={goal.id} style={styles.kpiRow}
                onClick={() => { setSelected(goal); setInputValue(current ?? ''); setInputDate(today()) }}>
                <div style={{ ...styles.rankBadge, background: '#4299e1' }}>{i + 1}</div>
                <div style={styles.kpiInfo}>
                  <div style={styles.kpiName}>{goal.kpi.title}</div>
                  <div style={styles.kpiTarget}>목표: {goal.kpi.targetValue}{goal.kpi.unit} · {goal.kpi.period}</div>
                </div>
                <div style={styles.currentBox}>
                  {historyCount > 0 && (
                    <span style={styles.historyBadge}>{historyCount}회 기록</span>
                  )}
                  {current !== null ? (
                    <>
                      <div style={{ ...styles.currentValue, color: getAchievementColor(rate) }}>
                        {current}{goal.kpi.unit}
                      </div>
                      <div style={{ ...styles.rateTag, background: getAchievementColor(rate) + '20', color: getAchievementColor(rate) }}>
                        {rate.toFixed(0)}%
                      </div>
                    </>
                  ) : (
                    <div style={styles.emptyTag}>클릭하여 입력</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 성과 추이 + 좋은 조언 (2단 레이아웃) */}
        {hasAnyHistory && (
          <div style={styles.twoCol}>
            {/* 좌: 시간순 성과 추이 */}
            <div style={styles.timelineCard}>
              <div style={styles.sectionTitle}>📈 시간순 성과 추이</div>
              {goals.filter(g => (g.progressHistory || []).length > 0).map(goal => {
                const target = parseFloat(goal.kpi.targetValue) || 100
                const history = [...(goal.progressHistory || [])].sort((a, b) => a.date.localeCompare(b.date))
                return (
                  <div key={goal.id} style={styles.tlGoal}>
                    <div style={styles.tlGoalTitle}>{goal.kpi.title}</div>
                    <div style={styles.tlGoalMeta}>목표: {goal.kpi.targetValue}{goal.kpi.unit}</div>
                    <div style={styles.tlEntries}>
                      {history.map((entry, idx) => {
                        const rate = Math.min((entry.value / target) * 100, 100)
                        const color = getAchievementColor(rate)
                        const prev = idx > 0 ? history[idx - 1].value : null
                        const trend = prev === null ? null : entry.value > prev ? '↑' : entry.value < prev ? '↓' : '→'
                        const trendColor = trend === '↑' ? '#48bb78' : trend === '↓' ? '#fc8181' : '#a0aec0'
                        return (
                          <div key={entry.id} style={styles.tlEntry}>
                            <div style={styles.tlDot} />
                            <div style={styles.tlLine} />
                            <div style={styles.tlContent}>
                              <div style={styles.tlDate}>{entry.date.replace(/-/g, '.')}</div>
                              <div style={styles.tlValueRow}>
                                <span style={{ ...styles.tlValue, color }}>{entry.value}{goal.kpi.unit}</span>
                                <span style={{ ...styles.tlRate, background: color + '20', color }}>{rate.toFixed(0)}%</span>
                                {trend && <span style={{ color: trendColor, fontWeight: 700, fontSize: '14px' }}>{trend}</span>}
                              </div>
                              <div style={styles.tlBar}>
                                <div style={{ ...styles.tlBarFill, width: `${rate}%`, background: color }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 우: 저장된 좋은 조언 */}
            <div style={styles.goodAdviceCard}>
              <div style={styles.sectionTitle}>⭐ 좋다고 평가한 개선 조언</div>
              {allGoodAdvices.length === 0 ? (
                <div style={styles.emptyAdvice}>
                  <div>아직 저장된 조언이 없습니다.</div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#a0aec0' }}>
                    아래 AI 조언에서 😊를 누르면 여기에 저장됩니다.
                  </div>
                </div>
              ) : (
                <div style={styles.goodAdviceList}>
                  {allGoodAdvices.map((a, i) => (
                    <div key={i} style={styles.goodAdviceItem}>
                      <div style={styles.goodAdviceKpi}>{a.kpiTitle}</div>
                      <div style={styles.goodAdviceText}>💡 {a.text}</div>
                      <div style={styles.goodAdviceDate}>{a.date}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 차트 */}
        {allFilled && (
          <div style={styles.chartCard}>
            <div style={styles.sectionTitle}>목표 vs 현재 비교</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value, name, props) => [value + (goals.find(g => g.kpi.title.startsWith(props.payload.name.replace('…', '')))?.kpi.unit || ''), name]}
                  labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                />
                <Legend />
                <Bar dataKey="목표" fill="#bee3f8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="현재" fill="#4299e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI 개선 조언 */}
        {allFilled && (
          <div style={styles.adviceSection}>
            <div style={styles.adviceHeader}>
              <div>
                <div style={styles.sectionTitle}>🔍 Gap 분석 — 달성률 하위 3개 항목 개선 조언</div>
                {advice && <div style={styles.feedbackHint}>각 조언 우측 표정 버튼으로 평가해주세요. 😊 좋아요를 누르면 위 조언 기록에 저장됩니다.</div>}
              </div>
              <div style={styles.adviceBtnGroup}>
                {!advice && (
                  <button style={{ ...styles.adviceBtn, opacity: loadingAdvice ? 0.5 : 1 }}
                    onClick={() => handleGetAdvice(false)} disabled={loadingAdvice}>
                    {loadingAdvice ? '⏳ 분석 중...' : '✨ AI 조언 받기'}
                  </button>
                )}
                {advice && hasFeedback && (
                  <button style={{ ...styles.retryBtn, opacity: loadingAdvice ? 0.5 : 1 }}
                    onClick={() => handleGetAdvice(true)} disabled={loadingAdvice}>
                    {loadingAdvice ? '⏳ 개선 중...' : '🔄 피드백 반영 재생성'}
                  </button>
                )}
              </div>
            </div>

            {getGapItems().map((item, i) => (
              <div key={item.id} style={styles.gapCard}>
                <div style={styles.gapRank}>#{i + 1} 우선 개선</div>
                <div style={styles.gapTitle}>{item.kpi.title}</div>
                <div style={styles.gapStats}>
                  달성률 {item.achievementRate.toFixed(1)}% · 목표 {item.kpi.targetValue}{item.kpi.unit} · 현재 {item.currentValue}{item.kpi.unit}
                </div>
                {advice?.[i] && (
                  <div style={styles.adviceList}>
                    {[{ text: advice[i].advice1, idx: 0 }, { text: advice[i].advice2, idx: 1 }].map(({ text, idx }) => {
                      const key = `${i}-${idx}`
                      const cur = adviceFeedback[key]
                      return (
                        <div key={idx} style={styles.adviceItemWrap}>
                          <div style={styles.adviceItemText}>💡 {text}</div>
                          <div style={styles.emojiBtns}>
                            {[
                              { value: 'good',    emoji: '😊', activeColor: '#F6E05E', activeBg: '#FFFFF0' },
                              { value: 'neutral', emoji: '😐', activeColor: '#A0AEC0', activeBg: '#F7FAFC' },
                              { value: 'bad',     emoji: '😢', activeColor: '#FC8181', activeBg: '#FFF5F5' },
                            ].map(({ value, emoji, activeColor, activeBg }) => (
                              <button key={value} style={{
                                ...styles.emojiBtn,
                                background: cur === value ? activeBg : 'transparent',
                                border: cur === value ? `2px solid ${activeColor}` : '2px solid transparent',
                                transform: cur === value ? 'scale(1.2)' : 'scale(1)',
                              }} onClick={() => handleFeedback(i, idx, value)}>{emoji}</button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 입력 모달 */}
      {selected && (
        <div style={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalTitle}>{selected.kpi.title}</div>
            <div style={styles.modalSub}>목표: {selected.kpi.targetValue}{selected.kpi.unit}</div>

            <div style={styles.modalLabel}>기록 일시</div>
            <input
              style={{ ...styles.modalInput, fontSize: '15px', marginBottom: '16px' }}
              type="date"
              value={inputDate}
              onChange={e => setInputDate(e.target.value)}
            />

            <div style={styles.modalLabel}>달성 수준</div>
            <div style={styles.modalInputRow}>
              <input
                style={styles.modalInput}
                type="number"
                placeholder={`0 ~ ${selected.kpi.targetValue}`}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                autoFocus
              />
              <span style={styles.modalUnit}>{selected.kpi.unit}</span>
            </div>

            {/* 이력 미리보기 */}
            {(selected.progressHistory || []).length > 0 && (
              <div style={styles.historyPreview}>
                <div style={styles.historyPreviewTitle}>기존 기록</div>
                {[...(selected.progressHistory || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map(e => (
                  <div key={e.id} style={styles.historyPreviewItem}>
                    <span style={styles.historyPreviewDate}>{e.date.replace(/-/g, '.')}</span>
                    <span>{e.value}{selected.kpi.unit}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.modalBtns}>
              <button style={styles.modalCancel} onClick={() => setSelected(null)}>취소</button>
              <button style={styles.modalSave} onClick={handleSaveValue}>기록 추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  bg: { minHeight: '100vh', background: '#f0f4f8', padding: '24px' },
  container: { maxWidth: '960px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  backBtn: { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#718096' },
  title: { fontSize: '22px', fontWeight: 800, margin: 0 },
  sub: { fontSize: '13px', color: '#718096', marginTop: '2px' },
  progressInfo: { fontSize: '14px', fontWeight: 700, color: '#4299e1' },

  kpiCard: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize: '14px', fontWeight: 700, color: '#4a5568', marginBottom: '16px' },
  kpiRow: { display: 'flex', alignItems: 'center', padding: '14px', border: '1px solid #f0f4f8', borderRadius: '10px', marginBottom: '8px', cursor: 'pointer', gap: '14px' },
  rankBadge: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 700, flexShrink: 0 },
  kpiInfo: { flex: 1 },
  kpiName: { fontSize: '14px', fontWeight: 700, color: '#2d3748' },
  kpiTarget: { fontSize: '12px', color: '#718096', marginTop: '2px' },
  currentBox: { display: 'flex', alignItems: 'center', gap: '8px' },
  historyBadge: { fontSize: '11px', color: '#9f7aea', background: '#faf5ff', border: '1px solid #d6bcfa', borderRadius: '10px', padding: '2px 8px' },
  currentValue: { fontSize: '16px', fontWeight: 800 },
  rateTag: { padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 },
  emptyTag: { fontSize: '12px', color: '#a0aec0', border: '1px dashed #e2e8f0', borderRadius: '8px', padding: '4px 10px' },

  // 2단 레이아웃
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px', marginBottom: '16px', alignItems: 'start' },

  // 타임라인
  timelineCard: { background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  tlGoal: { marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #f0f4f8' },
  tlGoalTitle: { fontSize: '14px', fontWeight: 800, color: '#2d3748', marginBottom: '2px' },
  tlGoalMeta: { fontSize: '11px', color: '#a0aec0', marginBottom: '12px' },
  tlEntries: { display: 'flex', flexDirection: 'column', gap: '0' },
  tlEntry: { display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative', paddingBottom: '14px' },
  tlDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#4299e1', flexShrink: 0, marginTop: '4px', zIndex: 1 },
  tlLine: { position: 'absolute', left: '4px', top: '14px', bottom: 0, width: '2px', background: '#e2e8f0' },
  tlContent: { flex: 1 },
  tlDate: { fontSize: '11px', color: '#a0aec0', fontWeight: 600, marginBottom: '4px' },
  tlValueRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' },
  tlValue: { fontSize: '16px', fontWeight: 800 },
  tlRate: { padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 },
  tlBar: { height: '6px', background: '#f0f4f8', borderRadius: '3px', overflow: 'hidden' },
  tlBarFill: { height: '100%', borderRadius: '3px', transition: 'width 0.3s' },

  // 좋은 조언
  goodAdviceCard: { background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  emptyAdvice: { background: '#f7fafc', borderRadius: '10px', padding: '20px', textAlign: 'center', fontSize: '13px', color: '#718096' },
  goodAdviceList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  goodAdviceItem: { background: '#fffff0', border: '1px solid #F6E05E', borderRadius: '10px', padding: '12px 14px' },
  goodAdviceKpi: { fontSize: '11px', fontWeight: 700, color: '#b7791f', textTransform: 'uppercase', marginBottom: '6px' },
  goodAdviceText: { fontSize: '13px', color: '#2d3748', lineHeight: 1.6, marginBottom: '6px' },
  goodAdviceDate: { fontSize: '11px', color: '#a0aec0' },

  chartCard: { background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  adviceSection: { background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  adviceHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' },
  feedbackHint: { fontSize: '12px', color: '#a0aec0', marginTop: '4px' },
  adviceBtnGroup: { display: 'flex', gap: '8px', flexShrink: 0 },
  adviceBtn: { padding: '10px 20px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' },
  retryBtn: { padding: '10px 16px', background: '#9f7aea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' },
  gapCard: { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '10px' },
  gapRank: { fontSize: '11px', fontWeight: 700, color: '#e53e3e', textTransform: 'uppercase', marginBottom: '4px' },
  gapTitle: { fontSize: '16px', fontWeight: 700, marginBottom: '6px' },
  gapStats: { fontSize: '13px', color: '#718096', marginBottom: '10px' },
  adviceList: { borderTop: '1px solid #f0f4f8', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  adviceItemWrap: { display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#f7fafc', borderRadius: '8px', padding: '10px 12px' },
  adviceItemText: { fontSize: '13px', color: '#2d3748', lineHeight: 1.6, flex: 1 },
  emojiBtns: { display: 'flex', gap: '2px', flexShrink: 0, paddingTop: '1px' },
  emojiBtn: { width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', padding: 0 },

  // 모달
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', borderRadius: '16px', padding: '28px', width: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: '17px', fontWeight: 800, marginBottom: '6px' },
  modalSub: { fontSize: '13px', color: '#718096', marginBottom: '20px' },
  modalLabel: { fontSize: '12px', fontWeight: 700, color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  modalInputRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
  modalInput: { flex: 1, padding: '12px', border: '2px solid #4299e1', borderRadius: '8px', fontSize: '18px', fontWeight: 700, outline: 'none', textAlign: 'center', width: '100%', boxSizing: 'border-box' },
  modalUnit: { fontSize: '16px', color: '#4a5568', fontWeight: 600 },
  historyPreview: { background: '#f7fafc', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' },
  historyPreviewTitle: { fontSize: '11px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', marginBottom: '8px' },
  historyPreviewItem: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4a5568', padding: '3px 0', borderBottom: '1px solid #edf2f7' },
  historyPreviewDate: { color: '#a0aec0' },
  modalBtns: { display: 'flex', gap: '10px' },
  modalCancel: { flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px' },
  modalSave: { flex: 1, padding: '12px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
}
