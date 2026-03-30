import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useStore } from '../store'
import { generateImprovementAdvice } from '../api/claude'

export default function Screen4_MidReview({ onBack }) {
  const { getGoals, getProfile, updateGoal } = useStore()
  const goals = getGoals()
  const profile = getProfile()

  const [selected, setSelected] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [advice, setAdvice] = useState(null)
  const [loadingAdvice, setLoadingAdvice] = useState(false)
  // { "gapIndex-adviceIndex": "good" | "neutral" | "bad" }
  const [adviceFeedback, setAdviceFeedback] = useState({})

  const hasFeedback = Object.keys(adviceFeedback).length > 0

  const handleFeedback = (gapIndex, adviceIndex, value) => {
    const key = `${gapIndex}-${adviceIndex}`
    setAdviceFeedback(prev =>
      prev[key] === value ? { ...prev, [key]: undefined } : { ...prev, [key]: value }
    )
  }

  const allFilled = goals.length > 0 && goals.every(g => g.currentValue !== null && g.currentValue !== undefined)

  const chartData = goals.map(g => ({
    name: g.kpi.title.length > 10 ? g.kpi.title.slice(0, 10) + '…' : g.kpi.title,
    fullName: g.kpi.title,
    목표: parseFloat(g.kpi.targetValue) || 100,
    현재: g.currentValue !== null ? parseFloat(g.currentValue) : 0,
  }))

  const getGapItems = () => {
    return goals
      .filter(g => g.currentValue !== null)
      .map(g => {
        const target = parseFloat(g.kpi.targetValue) || 100
        const current = parseFloat(g.currentValue) || 0
        const rate = target > 0 ? (current / target) * 100 : 0
        return { ...g, achievementRate: rate, gap: target - current }
      })
      .sort((a, b) => a.achievementRate - b.achievementRate)
      .slice(0, 3)
  }

  const handleSaveValue = () => {
    if (selected && inputValue !== '') {
      updateGoal(selected.id, { currentValue: parseFloat(inputValue) })
      setSelected(null)
      setInputValue('')
    }
  }

  const handleGetAdvice = async (withFeedback = false) => {
    setLoadingAdvice(true)
    try {
      const gapItems = getGapItems()
      const result = await generateImprovementAdvice(
        gapItems, profile.business, profile.department,
        withFeedback ? advice : null,
        withFeedback ? adviceFeedback : null
      )
      setAdvice(result.advices)
      setAdviceFeedback({})
    } catch (e) {
      console.error(e)
    }
    setLoadingAdvice(false)
  }

  const getAchievementColor = (rate) => {
    if (rate >= 90) return '#48bb78'
    if (rate >= 70) return '#ed8936'
    return '#fc8181'
  }

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>← 뒤로</button>
          <div>
            <h1 style={styles.title}>📊 중간 관리</h1>
            <div style={styles.sub}>현재 달성 수준을 입력하고 Gap을 분석하세요</div>
          </div>
          <div style={styles.progressInfo}>
            {goals.filter(g => g.currentValue !== null).length}/{goals.length} 입력 완료
          </div>
        </div>

        {/* KPI List */}
        <div style={styles.kpiCard}>
          <div style={styles.sectionTitle}>KPI 목록 — 항목을 클릭하여 현재 달성 수준 입력</div>
          {goals.map((goal, i) => {
            const target = parseFloat(goal.kpi.targetValue) || 100
            const current = goal.currentValue !== null ? parseFloat(goal.currentValue) : null
            const rate = current !== null ? (current / target) * 100 : null
            return (
              <div key={goal.id} style={styles.kpiRow} onClick={() => { setSelected(goal); setInputValue(goal.currentValue ?? '') }}>
                <div style={{ ...styles.rankBadge, background: '#4299e1' }}>{i + 1}</div>
                <div style={styles.kpiInfo}>
                  <div style={styles.kpiName}>{goal.kpi.title}</div>
                  <div style={styles.kpiTarget}>목표: {goal.kpi.targetValue}{goal.kpi.unit} · {goal.kpi.period}</div>
                </div>
                <div style={styles.currentBox}>
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

        {/* Modal */}
        {selected && (
          <div style={styles.modalOverlay} onClick={() => setSelected(null)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <div style={styles.modalTitle}>{selected.kpi.title}</div>
              <div style={styles.modalSub}>목표: {selected.kpi.targetValue}{selected.kpi.unit}</div>
              <div style={styles.modalLabel}>현재 달성 수준</div>
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
              <div style={styles.modalBtns}>
                <button style={styles.modalCancel} onClick={() => setSelected(null)}>취소</button>
                <button style={styles.modalSave} onClick={handleSaveValue}>저장</button>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        {allFilled && (
          <>
            <div style={styles.chartCard}>
              <div style={styles.sectionTitle}>목표 vs 현재 비교</div>
              <ResponsiveContainer width="100%" height={280}>
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

            <div style={styles.adviceSection}>
              <div style={styles.adviceHeader}>
                <div>
                  <div style={styles.sectionTitle}>🔍 Gap 분석 — 달성률 하위 3개 항목 개선 조언</div>
                  {advice && (
                    <div style={styles.feedbackHint}>
                      각 조언 우측의 표정 버튼으로 평가해주세요. 평가 후 재생성하면 더 나은 조언을 받을 수 있습니다.
                    </div>
                  )}
                </div>
                <div style={styles.adviceBtnGroup}>
                  {!advice && (
                    <button
                      style={{ ...styles.adviceBtn, opacity: loadingAdvice ? 0.5 : 1 }}
                      onClick={() => handleGetAdvice(false)}
                      disabled={loadingAdvice}
                    >
                      {loadingAdvice ? '⏳ 분석 중...' : '✨ AI 조언 받기'}
                    </button>
                  )}
                  {advice && hasFeedback && (
                    <button
                      style={{ ...styles.retryBtn, opacity: loadingAdvice ? 0.5 : 1 }}
                      onClick={() => handleGetAdvice(true)}
                      disabled={loadingAdvice}
                    >
                      {loadingAdvice ? '⏳ 개선 중...' : '🔄 피드백 반영하여 재생성'}
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
                  {advice && advice[i] && (
                    <div style={styles.adviceList}>
                      {[
                        { text: advice[i].advice1, idx: 0 },
                        { text: advice[i].advice2, idx: 1 },
                      ].map(({ text, idx }) => {
                        const key = `${i}-${idx}`
                        const current = adviceFeedback[key]
                        return (
                          <div key={idx} style={styles.adviceItemWrap}>
                            <div style={styles.adviceItemText}>💡 {text}</div>
                            <div style={styles.emojiBtns}>
                              {[
                                { value: 'good',    emoji: '😊', activeColor: '#F6E05E', activeBg: '#FFFFF0', title: '좋아요' },
                                { value: 'neutral', emoji: '😐', activeColor: '#A0AEC0', activeBg: '#F7FAFC', title: '보통이에요' },
                                { value: 'bad',     emoji: '😢', activeColor: '#FC8181', activeBg: '#FFF5F5', title: '아쉬워요' },
                              ].map(({ value, emoji, activeColor, activeBg, title }) => (
                                <button
                                  key={value}
                                  title={title}
                                  style={{
                                    ...styles.emojiBtn,
                                    background: current === value ? activeBg : 'transparent',
                                    border: current === value ? `2px solid ${activeColor}` : '2px solid transparent',
                                    transform: current === value ? 'scale(1.2)' : 'scale(1)',
                                  }}
                                  onClick={() => handleFeedback(i, idx, value)}
                                >
                                  {emoji}
                                </button>
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
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  bg: { minHeight: '100vh', background: '#f0f4f8', padding: '24px' },
  container: { maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  backBtn: { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#718096' },
  title: { fontSize: '22px', fontWeight: 800 },
  sub: { fontSize: '13px', color: '#718096', marginTop: '2px' },
  progressInfo: { fontSize: '14px', fontWeight: 700, color: '#4299e1' },
  kpiCard: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize: '14px', fontWeight: 700, color: '#4a5568', marginBottom: '16px' },
  kpiRow: { display: 'flex', alignItems: 'center', padding: '14px', border: '1px solid #f0f4f8', borderRadius: '10px', marginBottom: '8px', cursor: 'pointer', transition: 'background 0.15s', gap: '14px' },
  rankBadge: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 700, flexShrink: 0 },
  kpiInfo: { flex: 1 },
  kpiName: { fontSize: '14px', fontWeight: 700, color: '#2d3748' },
  kpiTarget: { fontSize: '12px', color: '#718096', marginTop: '2px' },
  currentBox: { display: 'flex', alignItems: 'center', gap: '8px' },
  currentValue: { fontSize: '16px', fontWeight: 800 },
  rateTag: { padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 },
  emptyTag: { fontSize: '12px', color: '#a0aec0', border: '1px dashed #e2e8f0', borderRadius: '8px', padding: '4px 10px' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', borderRadius: '16px', padding: '28px', width: '360px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: '18px', fontWeight: 800, marginBottom: '6px' },
  modalSub: { fontSize: '13px', color: '#718096', marginBottom: '20px' },
  modalLabel: { fontSize: '12px', fontWeight: 700, color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase' },
  modalInputRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' },
  modalInput: { flex: 1, padding: '12px', border: '2px solid #4299e1', borderRadius: '8px', fontSize: '18px', fontWeight: 700, outline: 'none', textAlign: 'center' },
  modalUnit: { fontSize: '16px', color: '#4a5568', fontWeight: 600 },
  modalBtns: { display: 'flex', gap: '10px' },
  modalCancel: { flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px' },
  modalSave: { flex: 1, padding: '12px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
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
}
