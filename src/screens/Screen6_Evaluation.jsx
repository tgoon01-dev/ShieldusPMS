import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStore } from '../store'

const GRADES = [
  { grade: 1, label: 'S', fullLabel: 'S등급', color: '#9f7aea', lightColor: '#e9d8fd', ratio: 0.1, desc: '탁월한 성과' },
  { grade: 2, label: 'A', fullLabel: 'A등급', color: '#4299e1', lightColor: '#bee3f8', ratio: 0.3, desc: '우수한 성과' },
  { grade: 3, label: 'B', fullLabel: 'B등급', color: '#48bb78', lightColor: '#c6f6d5', ratio: 0.4, desc: '양호한 성과' },
  { grade: 4, label: 'C', fullLabel: 'C등급', color: '#ed8936', lightColor: '#feebc8', ratio: 0.2, desc: '보통 성과' },
  { grade: 5, label: 'D', fullLabel: 'D등급', color: '#fc8181', lightColor: '#fed7d7', ratio: 0.1, desc: '미흡한 성과' },
]

// 등급 배분 시각화 컴포넌트
function GradeDistributionBar({ assigneeGrades, totalMembers }) {
  if (totalMembers === 0) return null
  return (
    <div style={distStyles.wrap}>
      <div style={distStyles.title}>📊 등급 배분 현황</div>
      <div style={distStyles.hint}>
        팀원 {totalMembers}명 기준 권장 배분입니다. 색이 채워지면 배정 완료, 붉은 색은 초과 배정입니다.
      </div>
      <div style={distStyles.rows}>
        {GRADES.map(g => {
          const quota = Math.max(1, Math.round(totalMembers * g.ratio))
          const assigned = Object.values(assigneeGrades).filter(v => v === g.grade).length
          const filled = Math.min(assigned, quota)
          const empty = quota - filled
          const overflow = Math.max(0, assigned - quota)
          return (
            <div key={g.grade} style={distStyles.row}>
              <div style={{ ...distStyles.gradeTag, background: g.color }}>{g.label}</div>
              <div style={distStyles.quotaLabel}>권장 {quota}명</div>
              <div style={distStyles.slots}>
                {Array.from({ length: filled }).map((_, i) => (
                  <div key={`f${i}`} style={{ ...distStyles.slot, background: g.color }} title={`${g.fullLabel} 배정됨`} />
                ))}
                {Array.from({ length: empty }).map((_, i) => (
                  <div key={`e${i}`} style={{ ...distStyles.slot, background: g.lightColor, border: `1.5px dashed ${g.color}80` }} title="미배정" />
                ))}
                {Array.from({ length: overflow }).map((_, i) => (
                  <div key={`o${i}`} style={{ ...distStyles.slot, background: '#fc8181', border: '1.5px solid #e53e3e' }} title="초과 배정" />
                ))}
              </div>
              <div style={{ ...distStyles.assignedLabel, color: overflow > 0 ? '#c53030' : assigned === quota ? g.color : '#a0aec0' }}>
                {assigned}명
                {overflow > 0 && <span style={distStyles.overflowBadge}>{overflow}명 초과</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ScoreSlider = ({ label, value, onChange }) => (
  <div style={sliderStyles.wrap}>
    <div style={sliderStyles.label}>{label}</div>
    <div style={sliderStyles.controls}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          style={{ ...sliderStyles.dot, background: n <= value ? '#4299e1' : '#e2e8f0', color: n <= value ? 'white' : '#a0aec0' }}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  </div>
)

export default function Screen6_Evaluation({ onBack }) {
  const { getGoals, getAssigneeGrades, setAssigneeGrade, updateGoal } = useStore()
  const goals = getGoals()
  const assigneeGrades = getAssigneeGrades()

  // 모든 목표에서 고유 담당자 추출
  const allAssignees = [...new Set(goals.flatMap(g => g.assignees || []))]

  const handleScoreChange = (goalId, field, value) => {
    const goal = goals.find(g => g.id === goalId)
    updateGoal(goalId, { scores: { ...goal.scores, [field]: parseInt(value) } })
  }

  const calcScore = (goal) => {
    const target = parseFloat(goal.kpi.targetValue) || 100
    const current = goal.currentValue !== null && goal.currentValue !== undefined ? parseFloat(goal.currentValue) : 0
    const achieveRate = Math.min((current / target) * 100, 100)
    const strategic = (goal.scores.strategicImportance / 5) * 100
    const difficulty = (goal.scores.difficulty / 5) * 100
    const contribution = (goal.scores.contribution / 5) * 100
    const total = achieveRate * 0.4 + strategic * 0.3 + difficulty * 0.15 + contribution * 0.15
    return { achieveRate, strategic, difficulty, contribution, total }
  }

  // KPI 종합점수 비교 차트 데이터
  const chartData = goals.map((g, i) => {
    const s = calcScore(g)
    return {
      name: `${i + 1}번`,
      fullName: g.kpi.title,
      종합점수: Math.round(s.total),
    }
  })

  const getBarColor = (score) => {
    if (score >= 80) return '#48bb78'
    if (score >= 60) return '#4299e1'
    if (score >= 40) return '#ed8936'
    return '#fc8181'
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = chartData.find(d => d.name === label)
      return (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#2d3748', marginBottom: '4px' }}>{item?.fullName}</div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: getBarColor(payload[0].value) }}>{payload[0].value}점</div>
        </div>
      )
    }
    return null
  }

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>← 뒤로</button>
          <div>
            <h1 style={styles.title}>⭐ 성과 평가</h1>
            <div style={styles.sub}>전략적 중요도·난이도·기여도를 입력하고 담당자별 등급을 배정하세요</div>
          </div>
          <div />
        </div>

        {/* KPI별 점수 입력 */}
        {goals.map((goal, i) => {
          const s = calcScore(goal)
          return (
            <div key={goal.id} style={styles.goalCard}>
              <div style={styles.goalHeader}>
                <div style={{ ...styles.rankBadge, background: '#9f7aea' }}>{i + 1}</div>
                <div style={styles.goalInfo}>
                  <div style={styles.goalName}>{goal.kpi.title}</div>
                  <div style={styles.goalMeta}>
                    목표 {goal.kpi.targetValue}{goal.kpi.unit} · 현재 {goal.currentValue ?? '-'}{goal.kpi.unit} · 달성 {s.achieveRate.toFixed(0)}%
                    {goal.assignees?.length > 0 && ` · 담당: ${goal.assignees.join(', ')}`}
                  </div>
                </div>
                <div style={{ ...styles.totalScore, color: getBarColor(s.total) }}>
                  {s.total.toFixed(0)}점
                </div>
              </div>
              <div style={styles.slidersRow}>
                <ScoreSlider label="전략적 중요도" value={goal.scores.strategicImportance} onChange={v => handleScoreChange(goal.id, 'strategicImportance', v)} />
                <ScoreSlider label="난이도" value={goal.scores.difficulty} onChange={v => handleScoreChange(goal.id, 'difficulty', v)} />
                <ScoreSlider label="기여도" value={goal.scores.contribution} onChange={v => handleScoreChange(goal.id, 'contribution', v)} />
              </div>
            </div>
          )
        })}

        {/* KPI 종합점수 비교 차트 */}
        {goals.length > 0 && (
          <div style={styles.chartCard}>
            <div style={styles.sectionTitle}>KPI 항목별 종합점수 비교 (100점 만점)</div>
            <div style={styles.chartLegend}>
              {chartData.map((d, i) => (
                <div key={i} style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: getBarColor(d.종합점수) }} />
                  <span style={styles.legendNum}>{d.name}</span>
                  <span style={styles.legendTitle}>{d.fullName}</span>
                  <span style={{ ...styles.legendScore, color: getBarColor(d.종합점수) }}>{d.종합점수}점</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="name" fontSize={13} fontWeight={700} />
                <YAxis domain={[0, 100]} fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="종합점수" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={getBarColor(d.종합점수)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 담당자별 등급 배정 */}
        {allAssignees.length > 0 && (
          <div style={styles.gradeCard}>
            <div style={styles.sectionTitle}>👤 담당자별 등급 배정</div>
            <div style={styles.gradeHint}>각 담당자에게 등급을 배정하세요. 하단 배분 현황을 참고하여 권장 비율에 맞게 배정합니다.</div>

            <div style={styles.assigneeList}>
              {allAssignees.map(name => {
                const currentGrade = assigneeGrades[name] || null
                // 해당 담당자가 배정된 KPI 목록
                const myGoals = goals.filter(g => (g.assignees || []).includes(name))
                const avgScore = myGoals.length > 0
                  ? myGoals.reduce((sum, g) => sum + calcScore(g).total, 0) / myGoals.length
                  : null

                return (
                  <div key={name} style={styles.assigneeRow}>
                    <div style={styles.assigneeInfo}>
                      <div style={styles.assigneeAvatar}>{name.charAt(0)}</div>
                      <div>
                        <div style={styles.assigneeName}>{name}</div>
                        {avgScore !== null && (
                          <div style={styles.assigneeScore}>
                            담당 KPI 평균 {avgScore.toFixed(0)}점
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={styles.gradeBtns}>
                      {GRADES.map(g => (
                        <button
                          key={g.grade}
                          title={`${g.fullLabel} - ${g.desc}`}
                          style={{
                            ...styles.gradeBtn,
                            background: currentGrade === g.grade ? g.color : g.lightColor,
                            color: currentGrade === g.grade ? 'white' : g.color,
                            border: `2px solid ${currentGrade === g.grade ? g.color : 'transparent'}`,
                            transform: currentGrade === g.grade ? 'scale(1.1)' : 'scale(1)',
                          }}
                          onClick={() => setAssigneeGrade(name, g.grade)}
                        >
                          {g.label}
                        </button>
                      ))}
                      {currentGrade && (
                        <div style={{ ...styles.gradeBadge, background: GRADES[currentGrade - 1].color }}>
                          {GRADES[currentGrade - 1].fullLabel}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 배분 현황 시각화 */}
            <GradeDistributionBar
              assigneeGrades={assigneeGrades}
              totalMembers={allAssignees.length}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const distStyles = {
  wrap: { marginTop: '28px', paddingTop: '24px', borderTop: '2px solid #f0f4f8' },
  title: { fontSize: '14px', fontWeight: 700, color: '#4a5568', marginBottom: '6px' },
  hint: { fontSize: '12px', color: '#a0aec0', marginBottom: '16px', lineHeight: 1.6 },
  rows: { display: 'flex', flexDirection: 'column', gap: '10px' },
  row: { display: 'flex', alignItems: 'center', gap: '12px' },
  gradeTag: { width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '14px', flexShrink: 0 },
  quotaLabel: { fontSize: '12px', color: '#a0aec0', width: '52px', flexShrink: 0 },
  slots: { display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 },
  slot: { width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0 },
  assignedLabel: { fontSize: '13px', fontWeight: 700, width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' },
  overflowBadge: { background: '#fff5f5', color: '#e53e3e', border: '1px solid #fc8181', borderRadius: '10px', padding: '2px 6px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' },
}

const sliderStyles = {
  wrap: { flex: 1 },
  label: { fontSize: '11px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '6px' },
  controls: { display: 'flex', gap: '4px' },
  dot: { width: '28px', height: '28px', borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, transition: 'all 0.15s' },
}

const styles = {
  bg: { minHeight: '100vh', background: '#f0f4f8', padding: '24px' },
  container: { maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  backBtn: { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#718096' },
  title: { fontSize: '22px', fontWeight: 800 },
  sub: { fontSize: '13px', color: '#718096', marginTop: '2px' },
  goalCard: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  goalHeader: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' },
  rankBadge: { width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 700, flexShrink: 0 },
  goalInfo: { flex: 1 },
  goalName: { fontSize: '15px', fontWeight: 700, color: '#2d3748' },
  goalMeta: { fontSize: '12px', color: '#718096', marginTop: '3px' },
  totalScore: { fontSize: '26px', fontWeight: 900, flexShrink: 0 },
  slidersRow: { display: 'flex', gap: '24px' },
  chartCard: { background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize: '14px', fontWeight: 700, color: '#4a5568', marginBottom: '16px' },
  chartLegend: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  legendNum: { fontWeight: 800, color: '#2d3748', width: '36px' },
  legendTitle: { color: '#718096', flex: 1 },
  legendScore: { fontWeight: 800, fontSize: '15px' },
  gradeCard: { background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '24px' },
  gradeHint: { fontSize: '13px', color: '#a0aec0', marginBottom: '20px', marginTop: '-8px', lineHeight: 1.6 },
  assigneeList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '4px' },
  assigneeRow: { display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', background: '#f7fafc', borderRadius: '12px' },
  assigneeInfo: { display: 'flex', alignItems: 'center', gap: '10px', width: '130px', flexShrink: 0 },
  assigneeAvatar: { width: '36px', height: '36px', background: '#4299e1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: 'white', flexShrink: 0 },
  assigneeName: { fontSize: '15px', fontWeight: 700, color: '#2d3748' },
  assigneeScore: { fontSize: '11px', color: '#718096', marginTop: '2px' },
  gradeBtns: { display: 'flex', gap: '6px', alignItems: 'center', flex: 1, flexWrap: 'wrap' },
  gradeBtn: { width: '38px', height: '38px', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: 900, transition: 'all 0.15s', flexShrink: 0 },
  gradeBadge: { padding: '4px 12px', borderRadius: '20px', color: 'white', fontSize: '12px', fontWeight: 700, marginLeft: '6px' },
}
