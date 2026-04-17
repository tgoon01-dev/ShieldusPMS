import React, { useState } from 'react'
import { useStore } from '../store'
import { generateImprovementAdvice } from '../api/claude'

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function Screen4_MidReview({ onBack }) {
  const { getGoals, getProfile, updateGoal } = useStore()
  const goals = getGoals()
  const profile = getProfile()

  const [selectedId, setSelectedId] = useState(null)

  // 달성 현황 입력 모달
  const [inputModal, setInputModal] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [inputDate, setInputDate] = useState(todayStr())

  // AI 조언
  const [advice, setAdvice] = useState(null)
  const [loadingAdvice, setLoadingAdvice] = useState(false)
  const [adviceFeedback, setAdviceFeedback] = useState({})

  const selected = goals.find(g => g.id === selectedId) || null

  const getRate = (goal) => {
    const target = parseFloat(goal.kpi.targetValue) || 100
    const current = goal.currentValue !== null && goal.currentValue !== undefined
      ? parseFloat(goal.currentValue) : null
    if (current === null) return null
    return Math.min((current / target) * 100, 200)
  }

  const rateColor = (rate) => {
    if (rate === null) return '#a0aec0'
    if (rate >= 90) return '#38a169'
    if (rate >= 70) return '#dd6b20'
    return '#e53e3e'
  }

  // KPI 카드 클릭 → 선택/해제
  const handleSelectKpi = (goal) => {
    if (selectedId === goal.id) {
      setSelectedId(null)
    } else {
      setSelectedId(goal.id)
      setAdvice(null)
      setAdviceFeedback({})
    }
  }

  // 달성 현황 저장
  const handleSaveValue = () => {
    if (!selected || inputValue === '') return
    const val = parseFloat(inputValue)
    const newEntry = { id: Date.now().toString(), date: inputDate, value: val }
    const prevHistory = selected.progressHistory || []
    const updatedHistory = [...prevHistory, newEntry].sort((a, b) => a.date.localeCompare(b.date))
    updateGoal(selected.id, {
      progressHistory: updatedHistory,
      currentValue: updatedHistory[updatedHistory.length - 1].value,
    })
    setInputModal(false)
    setInputValue('')
    setInputDate(todayStr())
  }

  // AI 조언 요청
  const handleGetAdvice = async (withFeedback = false) => {
    if (!selected) return
    setLoadingAdvice(true)
    const target = parseFloat(selected.kpi.targetValue) || 100
    const current = selected.currentValue !== null && selected.currentValue !== undefined
      ? parseFloat(selected.currentValue) : 0
    const achievementRate = target > 0 ? (current / target) * 100 : 0
    const gapItem = { ...selected, achievementRate, gap: target - current }
    try {
      const result = await generateImprovementAdvice(
        [gapItem], profile.business, profile.department,
        withFeedback && advice ? [advice] : null,
        withFeedback ? adviceFeedback : null,
      )
      setAdvice(result.advices[0])
      setAdviceFeedback({})
    } catch (e) {
      console.error(e)
    }
    setLoadingAdvice(false)
  }

  // 이모지 피드백
  const handleFeedback = (idx, value) => {
    const key = `0-${idx}`
    const prev = adviceFeedback[key]
    const next = prev === value ? undefined : value
    setAdviceFeedback(p => ({ ...p, [key]: next }))

    // 😊 누르면 good advice 저장
    if (value === 'good' && prev !== 'good' && selected && advice) {
      const text = idx === 0 ? advice.advice1 : advice.advice2
      const existing = goals.find(g => g.id === selected.id)
      const prevGood = existing?.goodAdvices || []
      if (!prevGood.some(a => a.text === text)) {
        updateGoal(selected.id, {
          goodAdvices: [...prevGood, { text, date: todayStr(), kpiTitle: selected.kpi.title }],
        })
      }
    }
  }

  const hasFeedback = Object.values(adviceFeedback).some(v => v !== undefined)

  return (
    <div style={s.bg}>
      <div style={s.container}>
        {/* 헤더 */}
        <div style={s.header}>
          <button style={s.backBtn} onClick={onBack}>← 뒤로</button>
          <div>
            <h1 style={s.title}>📊 중간 관리</h1>
            <div style={s.sub}>KPI를 선택하여 달성 현황을 기록하고 조언을 받으세요</div>
          </div>
          <div style={s.progressInfo}>
            {goals.filter(g => g.currentValue !== null).length}/{goals.length} 입력 완료
          </div>
        </div>

        {goals.length === 0 ? (
          <div style={s.emptyCard}>
            <div style={s.emptyIcon}>📋</div>
            <div>설정된 KPI가 없습니다. 먼저 목표를 설정해 주세요.</div>
          </div>
        ) : (
          <>
            {/* KPI 목록 */}
            <div style={s.kpiListCard}>
              <div style={s.sectionLabel}>KPI 목록 — 항목을 클릭하면 상세 현황을 확인할 수 있습니다</div>
              {goals.map((goal, i) => {
                const rate = getRate(goal)
                const color = rateColor(rate)
                const isSelected = selectedId === goal.id
                const histCount = (goal.progressHistory || []).length
                return (
                  <div
                    key={goal.id}
                    style={{
                      ...s.kpiCard,
                      borderColor: isSelected ? '#4299e1' : '#e2e8f0',
                      borderWidth: isSelected ? '2px' : '1px',
                      background: isSelected ? '#ebf8ff' : 'white',
                    }}
                    onClick={() => handleSelectKpi(goal)}
                  >
                    <div style={{ ...s.kpiNum, background: isSelected ? '#4299e1' : '#e2e8f0', color: isSelected ? 'white' : '#718096' }}>
                      {i + 1}
                    </div>
                    <div style={s.kpiCardInfo}>
                      <div style={s.kpiCardTitle}>{goal.kpi.title}</div>
                      <div style={s.kpiCardMeta}>
                        목표 {goal.kpi.targetValue}{goal.kpi.unit}
                        {histCount > 0 && <span style={s.histBadge}>{histCount}회 기록</span>}
                      </div>
                    </div>
                    <div style={s.kpiCardRight}>
                      {rate !== null ? (
                        <>
                          <span style={{ ...s.kpiRateBadge, color, borderColor: color + '55' }}>
                            {rate.toFixed(0)}%
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color }}>
                            {goal.currentValue}{goal.kpi.unit}
                          </span>
                        </>
                      ) : (
                        <span style={s.noDataChip}>미입력</span>
                      )}
                      <span style={{ ...s.chevron, transform: isSelected ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 선택된 KPI 상세 패널 */}
            {selected && (
              <div style={s.detailPanel}>
                <div style={s.detailHeader}>
                  <div style={s.detailTitle}>{selected.kpi.title}</div>
                  <div style={s.detailMeta}>
                    목표 {selected.kpi.targetValue}{selected.kpi.unit}
                    {selected.kpi.period && ` · ${selected.kpi.period}`}
                  </div>
                </div>

                {/* 📈 성과 추이 타임라인 */}
                <div style={s.section}>
                  <div style={s.sectionRowBetween}>
                    <div style={s.sectionLabel}>📈 성과 추이</div>
                    <button
                      style={s.addValueBtn}
                      onClick={() => { setInputValue(''); setInputDate(todayStr()); setInputModal(true) }}
                    >
                      + 달성 현황 추가
                    </button>
                  </div>

                  {(selected.progressHistory || []).length === 0 ? (
                    <div style={s.emptyTimeline}>아직 기록된 달성 현황이 없습니다.</div>
                  ) : (
                    <div style={s.timeline}>
                      {[...(selected.progressHistory || [])]
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((entry, idx, arr) => {
                          const target = parseFloat(selected.kpi.targetValue) || 100
                          const rate = Math.min((entry.value / target) * 100, 100)
                          const color = rateColor(rate)
                          const prev = idx > 0 ? arr[idx - 1].value : null
                          const trend = prev === null ? null : entry.value > prev ? '↑' : entry.value < prev ? '↓' : '→'
                          const trendColor = trend === '↑' ? '#38a169' : trend === '↓' ? '#e53e3e' : '#a0aec0'
                          return (
                            <div key={entry.id} style={s.tlEntry}>
                              <div style={s.tlDotWrap}>
                                <div style={{ ...s.tlDot, background: color }} />
                                {idx < arr.length - 1 && <div style={s.tlLine} />}
                              </div>
                              <div style={s.tlContent}>
                                <div style={s.tlDate}>{entry.date.replace(/-/g, '.')}</div>
                                <div style={s.tlValueRow}>
                                  <span style={{ ...s.tlValue, color }}>{entry.value}{selected.kpi.unit}</span>
                                  <span style={{ ...s.tlRate, background: color + '20', color }}>{rate.toFixed(0)}%</span>
                                  {trend && <span style={{ color: trendColor, fontWeight: 800, fontSize: '15px' }}>{trend}</span>}
                                </div>
                                <div style={s.tlBarTrack}>
                                  <div style={{ ...s.tlBarFill, width: `${rate}%`, background: color }} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>

                {/* ⭐ 좋은 조언 히스토리 */}
                {(selected.goodAdvices || []).length > 0 && (
                  <div style={s.section}>
                    <div style={s.sectionLabel}>⭐ 저장된 좋은 조언</div>
                    <div style={s.goodAdviceList}>
                      {(selected.goodAdvices || []).map((a, i) => (
                        <div key={i} style={s.goodAdviceItem}>
                          <div style={s.goodAdviceText}>💡 {a.text}</div>
                          <div style={s.goodAdviceDate}>{a.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🤖 AI 개선 조언 */}
                <div style={s.section}>
                  <div style={s.sectionRowBetween}>
                    <div style={s.sectionLabel}>🤖 AI 개선 조언</div>
                    {!advice && (
                      <button
                        style={{ ...s.adviceBtn, opacity: loadingAdvice ? 0.5 : 1 }}
                        onClick={() => handleGetAdvice(false)}
                        disabled={loadingAdvice}
                      >
                        {loadingAdvice ? '⏳ 분석 중...' : '✨ 조언 받기'}
                      </button>
                    )}
                    {advice && hasFeedback && (
                      <button
                        style={{ ...s.retryBtn, opacity: loadingAdvice ? 0.5 : 1 }}
                        onClick={() => handleGetAdvice(true)}
                        disabled={loadingAdvice}
                      >
                        {loadingAdvice ? '⏳ 개선 중...' : '🔄 피드백 반영 재생성'}
                      </button>
                    )}
                    {advice && !hasFeedback && (
                      <button style={s.resetBtn} onClick={() => setAdvice(null)}>↺ 새로 받기</button>
                    )}
                  </div>

                  {advice && (
                    <>
                      {advice.gap && (
                        <div style={s.gapSummary}>📌 {advice.gap}</div>
                      )}
                      <div style={s.adviceFeedbackHint}>
                        😊를 클릭하면 위 '저장된 좋은 조언'에 기록됩니다.
                      </div>
                      <div style={s.adviceList}>
                        {[advice.advice1, advice.advice2].map((text, idx) => {
                          const key = `0-${idx}`
                          const cur = adviceFeedback[key]
                          return (
                            <div key={idx} style={s.adviceItem}>
                              <div style={s.adviceText}>💡 {text}</div>
                              <div style={s.emojiBtns}>
                                {[
                                  { value: 'good', emoji: '😊', activeColor: '#D69E2E', activeBg: '#FFFFF0' },
                                  { value: 'neutral', emoji: '😐', activeColor: '#A0AEC0', activeBg: '#F7FAFC' },
                                  { value: 'bad', emoji: '😢', activeColor: '#E53E3E', activeBg: '#FFF5F5' },
                                ].map(({ value, emoji, activeColor, activeBg }) => (
                                  <button key={value} style={{
                                    ...s.emojiBtn,
                                    background: cur === value ? activeBg : 'transparent',
                                    border: cur === value ? `2px solid ${activeColor}` : '2px solid transparent',
                                    transform: cur === value ? 'scale(1.2)' : 'scale(1)',
                                  }} onClick={() => handleFeedback(idx, value)}>{emoji}</button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {!advice && !loadingAdvice && (
                    <div style={s.adviceEmpty}>
                      이 KPI에 대한 AI 개선 조언을 받아보세요.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 달성 현황 입력 모달 */}
      {inputModal && selected && (
        <div style={s.overlay} onClick={() => setInputModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>{selected.kpi.title}</div>
            <div style={s.modalSub}>목표: {selected.kpi.targetValue}{selected.kpi.unit}</div>

            <div style={s.modalLabel}>기록 일시</div>
            <input
              style={{ ...s.modalInput, marginBottom: '16px', textAlign: 'left', fontSize: '15px' }}
              type="date"
              value={inputDate}
              onChange={e => setInputDate(e.target.value)}
            />

            <div style={s.modalLabel}>달성 수준</div>
            <div style={s.modalInputRow}>
              <input
                style={s.modalInput}
                type="number"
                placeholder={`0 ~ ${selected.kpi.targetValue}`}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                autoFocus
              />
              <span style={s.modalUnit}>{selected.kpi.unit}</span>
            </div>

            {(selected.progressHistory || []).length > 0 && (
              <div style={s.histPreview}>
                <div style={s.histPreviewTitle}>기존 기록</div>
                {[...(selected.progressHistory || [])]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 3)
                  .map(e => (
                    <div key={e.id} style={s.histPreviewRow}>
                      <span style={s.histPreviewDate}>{e.date.replace(/-/g, '.')}</span>
                      <span>{e.value}{selected.kpi.unit}</span>
                    </div>
                  ))}
              </div>
            )}

            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={() => setInputModal(false)}>취소</button>
              <button style={s.modalSave} onClick={handleSaveValue}>기록 추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  bg: { minHeight: '100vh', background: '#f0f4f8', padding: '24px' },
  container: { maxWidth: '860px', margin: '0 auto' },

  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '20px', background: 'white', padding: '20px 24px',
    borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  backBtn: { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#718096' },
  title: { fontSize: '22px', fontWeight: 800, margin: 0 },
  sub: { fontSize: '13px', color: '#718096', marginTop: '2px' },
  progressInfo: { fontSize: '14px', fontWeight: 700, color: '#4299e1' },

  emptyCard: { background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#a0aec0', fontSize: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  emptyIcon: { fontSize: '36px', marginBottom: '12px' },

  kpiListCard: {
    background: 'white', borderRadius: '16px', padding: '20px',
    marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  sectionLabel: { fontSize: '12px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '12px' },

  kpiCard: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',
    marginBottom: '8px', cursor: 'pointer', transition: 'all 0.15s',
  },
  kpiNum: { width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 },
  kpiCardInfo: { flex: 1, minWidth: 0 },
  kpiCardTitle: { fontSize: '14px', fontWeight: 700, color: '#2d3748', marginBottom: '2px' },
  kpiCardMeta: { fontSize: '12px', color: '#718096', display: 'flex', alignItems: 'center', gap: '8px' },
  histBadge: { fontSize: '10px', color: '#9f7aea', background: '#faf5ff', border: '1px solid #d6bcfa', borderRadius: '10px', padding: '1px 7px' },
  kpiCardRight: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  kpiRateBadge: { fontSize: '12px', fontWeight: 800, border: '1px solid', borderRadius: '6px', padding: '2px 7px', background: 'white' },
  noDataChip: { fontSize: '11px', color: '#a0aec0', border: '1px dashed #e2e8f0', borderRadius: '8px', padding: '3px 8px' },
  chevron: { fontSize: '20px', color: '#a0aec0', transition: 'transform 0.2s', fontWeight: 300 },

  // 상세 패널
  detailPanel: {
    background: 'white', borderRadius: '16px', padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  detailHeader: { marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #f0f4f8' },
  detailTitle: { fontSize: '18px', fontWeight: 800, color: '#1a202c', marginBottom: '4px' },
  detailMeta: { fontSize: '13px', color: '#718096' },

  section: { marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f0f4f8' },
  sectionRowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },

  // 좋은 조언
  goodAdviceList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  goodAdviceItem: { background: '#fffff0', border: '1px solid #F6E05E', borderRadius: '10px', padding: '12px 14px' },
  goodAdviceText: { fontSize: '13px', color: '#2d3748', lineHeight: 1.6, marginBottom: '4px' },
  goodAdviceDate: { fontSize: '11px', color: '#b7791f' },

  // 타임라인
  addValueBtn: {
    padding: '6px 14px', background: '#4299e1', color: 'white',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
  },
  emptyTimeline: { background: '#f7fafc', borderRadius: '8px', padding: '16px', textAlign: 'center', fontSize: '13px', color: '#a0aec0' },
  timeline: { display: 'flex', flexDirection: 'column' },
  tlEntry: { display: 'flex', gap: '14px', alignItems: 'flex-start' },
  tlDotWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12px', flexShrink: 0, paddingTop: '4px' },
  tlDot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, zIndex: 1 },
  tlLine: { width: '2px', flex: 1, background: '#e2e8f0', minHeight: '20px', margin: '2px 0' },
  tlContent: { flex: 1, paddingBottom: '14px' },
  tlDate: { fontSize: '11px', color: '#a0aec0', fontWeight: 600, marginBottom: '4px' },
  tlValueRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' },
  tlValue: { fontSize: '16px', fontWeight: 800 },
  tlRate: { padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 },
  tlBarTrack: { height: '6px', background: '#f0f4f8', borderRadius: '3px', overflow: 'hidden', maxWidth: '240px' },
  tlBarFill: { height: '100%', borderRadius: '3px', transition: 'width 0.3s' },

  // 조언
  adviceBtn: { padding: '7px 16px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 },
  retryBtn: { padding: '7px 14px', background: '#9f7aea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 },
  resetBtn: { padding: '7px 14px', background: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 },
  gapSummary: { background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#c53030', marginBottom: '10px' },
  adviceFeedbackHint: { fontSize: '11px', color: '#a0aec0', marginBottom: '10px' },
  adviceList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  adviceItem: { display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#f7fafc', borderRadius: '8px', padding: '12px 14px' },
  adviceText: { flex: 1, fontSize: '13px', color: '#2d3748', lineHeight: 1.6 },
  emojiBtns: { display: 'flex', gap: '2px', flexShrink: 0, paddingTop: '1px' },
  emojiBtn: { width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', padding: 0 },
  adviceEmpty: { background: '#f7fafc', borderRadius: '8px', padding: '16px', textAlign: 'center', fontSize: '13px', color: '#a0aec0' },

  // 모달
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', borderRadius: '16px', padding: '28px', width: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: '17px', fontWeight: 800, marginBottom: '6px', color: '#1a202c' },
  modalSub: { fontSize: '13px', color: '#718096', marginBottom: '20px' },
  modalLabel: { fontSize: '11px', fontWeight: 700, color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  modalInputRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
  modalInput: { flex: 1, padding: '12px', border: '2px solid #4299e1', borderRadius: '8px', fontSize: '18px', fontWeight: 700, outline: 'none', textAlign: 'center', width: '100%', boxSizing: 'border-box' },
  modalUnit: { fontSize: '16px', color: '#4a5568', fontWeight: 600 },
  histPreview: { background: '#f7fafc', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' },
  histPreviewTitle: { fontSize: '11px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', marginBottom: '8px' },
  histPreviewRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4a5568', padding: '3px 0', borderBottom: '1px solid #edf2f7' },
  histPreviewDate: { color: '#a0aec0' },
  modalBtns: { display: 'flex', gap: '10px' },
  modalCancel: { flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px' },
  modalSave: { flex: 1, padding: '12px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
}
