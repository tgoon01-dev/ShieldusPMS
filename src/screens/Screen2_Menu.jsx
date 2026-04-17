import React from 'react'
import { useStore } from '../store'

const MENU_ITEMS = [
  {
    id: 'goals',
    num: '1',
    title: '목표 설정',
    desc: 'SMART KPI 수립 및 구성원 R&R 배정',
    icon: '🎯',
    color: '#4299e1',
    bgColor: '#ebf8ff',
    always: true,
  },
  {
    id: 'mid-review',
    num: '2',
    title: '중간 관리',
    desc: '달성 현황 입력 및 Gap 분석',
    icon: '📊',
    color: '#48bb78',
    bgColor: '#f0fff4',
    always: false,
  },
  {
    id: 'coaching',
    num: '3',
    title: '코칭/피드백 시뮬레이션',
    desc: '성과 면담 AI 롤플레이 연습',
    icon: '💬',
    color: '#ed8936',
    bgColor: '#fffaf0',
    always: true,
  },
]

function getAchievementRate(goal) {
  const val = goal.currentValue !== null && goal.currentValue !== undefined
    ? Number(goal.currentValue)
    : null
  const target = Number(goal.targetValue)
  if (val === null || isNaN(val) || isNaN(target) || target === 0) return null
  return Math.min(Math.round((val / target) * 100), 200)
}

function rateColor(rate) {
  if (rate === null) return '#cbd5e0'
  if (rate >= 80) return '#48bb78'
  if (rate >= 50) return '#ed8936'
  return '#fc8181'
}

function rateBg(rate) {
  if (rate === null) return '#edf2f7'
  if (rate >= 80) return '#f0fff4'
  if (rate >= 50) return '#fffaf0'
  return '#fff5f5'
}

function KpiDashboard({ goals, onGoToGoals }) {
  if (goals.length === 0) {
    return (
      <div style={db.emptyCard}>
        <div style={db.emptyIcon}>📋</div>
        <div style={db.emptyTitle}>설정된 KPI가 없습니다</div>
        <div style={db.emptyDesc}>목표를 설정해 주십시오.</div>
        <button style={db.emptyBtn} onClick={onGoToGoals}>목표 설정하러 가기 →</button>
      </div>
    )
  }

  const rates = goals.map(g => getAchievementRate(g))
  const withData = rates.filter(r => r !== null)
  const avgRate = withData.length > 0
    ? Math.round(withData.reduce((a, b) => a + b, 0) / withData.length)
    : null

  return (
    <div style={db.card}>
      <div style={db.topRow}>
        <div style={db.cardTitle}>KPI 달성 현황</div>
        <div style={db.summary}>
          <div style={db.summaryItem}>
            <span style={db.summaryNum}>{goals.length}</span>
            <span style={db.summaryLabel}>전체 KPI</span>
          </div>
          <div style={db.divider} />
          <div style={db.summaryItem}>
            <span style={db.summaryNum}>{withData.length}</span>
            <span style={db.summaryLabel}>측정 완료</span>
          </div>
          <div style={db.divider} />
          <div style={{ ...db.summaryItem }}>
            <span style={{ ...db.summaryNum, color: avgRate !== null ? rateColor(avgRate) : '#a0aec0' }}>
              {avgRate !== null ? `${avgRate}%` : '-'}
            </span>
            <span style={db.summaryLabel}>평균 달성률</span>
          </div>
        </div>
      </div>

      {avgRate !== null && (
        <div style={db.overallBarWrap}>
          <div style={db.overallBarTrack}>
            <div style={{
              ...db.overallBarFill,
              width: `${Math.min(avgRate, 100)}%`,
              background: rateColor(avgRate),
            }} />
            <div style={{ ...db.overallBarLabel, color: rateColor(avgRate) }}>{avgRate}%</div>
          </div>
          <div style={db.overallBarCaption}>전체 평균 달성률</div>
        </div>
      )}

      <div style={db.kpiList}>
        {goals.map(goal => {
          const rate = getAchievementRate(goal)
          const color = rateColor(rate)
          const bg = rateBg(rate)
          return (
            <div key={goal.id} style={{ ...db.kpiRow, background: bg }}>
              <div style={db.kpiLeft}>
                <div style={db.kpiPerspective}>{goal.perspective || ''}</div>
                <div style={db.kpiTitle}>{goal.title}</div>
                <div style={db.kpiValues}>
                  {rate !== null
                    ? <span>{goal.currentValue}{goal.unit} <span style={db.slash}>/</span> 목표 {goal.targetValue}{goal.unit}</span>
                    : <span style={db.noData}>달성 현황 미입력</span>
                  }
                </div>
              </div>
              <div style={db.kpiRight}>
                <div style={{ ...db.rateBadge, color, borderColor: color + '60', background: 'white' }}>
                  {rate !== null ? `${rate}%` : '-'}
                </div>
                <div style={db.barTrack}>
                  <div style={{
                    ...db.barFill,
                    width: rate !== null ? `${Math.min(rate, 100)}%` : '0%',
                    background: color,
                  }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Screen2_Menu({ onSelect, onLogout }) {
  const getProfile = useStore(s => s.getProfile)
  const getGoals = useStore(s => s.getGoals)
  const profile = getProfile()
  const goals = getGoals()
  const hasGoals = goals.length > 0

  const isEnabled = (item) => {
    if (item.always) return true
    if (item.id === 'mid-review') return hasGoals
    return true
  }

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.greeting}>안녕하세요, {profile.name || profile.department} 팀장님 👋</div>
            <div style={styles.sub}>{profile.business} · {profile.email}</div>
          </div>
          <button style={styles.logoutBtn} onClick={onLogout}>로그아웃</button>
        </div>

        <KpiDashboard goals={goals} onGoToGoals={() => onSelect('goals')} />

        <div style={styles.sectionTitle}>기능 선택</div>
        <div style={styles.grid}>
          {MENU_ITEMS.map(item => {
            const enabled = isEnabled(item)
            return (
              <button
                key={item.id}
                style={{
                  ...styles.menuCard,
                  borderColor: enabled ? item.color + '40' : '#e2e8f0',
                  opacity: enabled ? 1 : 0.5,
                  cursor: enabled ? 'pointer' : 'not-allowed',
                }}
                onClick={() => enabled && onSelect(item.id)}
                disabled={!enabled}
              >
                <div style={{ ...styles.menuIcon, background: enabled ? item.bgColor : '#f7fafc', color: item.color }}>
                  {item.icon}
                </div>
                <div style={styles.menuNum}>{item.num}</div>
                <div style={styles.menuTitle}>{item.title}</div>
                <div style={styles.menuDesc}>{item.desc}</div>
                {!enabled && (
                  <div style={styles.lockBadge}>목표 설정 후 활성화</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const db = {
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px 24px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  emptyCard: {
    background: '#f7fafc',
    border: '2px dashed #e2e8f0',
    borderRadius: '16px',
    padding: '36px 24px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  emptyIcon: { fontSize: '36px', marginBottom: '12px' },
  emptyTitle: { fontSize: '16px', fontWeight: 700, color: '#a0aec0', marginBottom: '6px' },
  emptyDesc: { fontSize: '13px', color: '#cbd5e0', marginBottom: '16px' },
  emptyBtn: {
    padding: '8px 20px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  cardTitle: { fontSize: '14px', fontWeight: 700, color: '#2d3748' },
  summary: { display: 'flex', alignItems: 'center', gap: '12px' },
  summaryItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  summaryNum: { fontSize: '18px', fontWeight: 800, color: '#2d3748' },
  summaryLabel: { fontSize: '10px', color: '#a0aec0', fontWeight: 600 },
  divider: { width: '1px', height: '28px', background: '#e2e8f0' },
  overallBarWrap: { marginBottom: '14px' },
  overallBarTrack: {
    position: 'relative',
    height: '10px',
    background: '#edf2f7',
    borderRadius: '999px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  overallBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.5s ease',
  },
  overallBarLabel: {
    position: 'absolute',
    right: '8px',
    top: '-1px',
    fontSize: '9px',
    fontWeight: 700,
    lineHeight: '12px',
  },
  overallBarCaption: { fontSize: '11px', color: '#a0aec0', textAlign: 'right' },
  kpiList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  kpiRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: '10px',
  },
  kpiLeft: { flex: 1, minWidth: 0 },
  kpiPerspective: { fontSize: '10px', color: '#a0aec0', fontWeight: 600, marginBottom: '2px' },
  kpiTitle: { fontSize: '13px', fontWeight: 700, color: '#2d3748', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  kpiValues: { fontSize: '11px', color: '#718096' },
  slash: { color: '#cbd5e0' },
  noData: { color: '#cbd5e0', fontStyle: 'italic' },
  kpiRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', marginLeft: '16px', minWidth: '80px' },
  rateBadge: {
    fontSize: '13px',
    fontWeight: 800,
    border: '1px solid',
    borderRadius: '6px',
    padding: '2px 8px',
  },
  barTrack: { width: '80px', height: '6px', background: '#edf2f7', borderRadius: '999px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '999px', transition: 'width 0.4s ease' },
}

const styles = {
  bg: {
    minHeight: '100vh',
    background: '#f0f4f8',
    padding: '24px',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    background: 'white',
    padding: '18px 24px',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  greeting: { fontSize: '20px', fontWeight: 700, color: '#1a202c' },
  sub: { fontSize: '13px', color: '#718096', marginTop: '4px' },
  logoutBtn: {
    padding: '7px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#718096',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#a0aec0',
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  menuCard: {
    background: 'white',
    border: '2px solid',
    borderRadius: '14px',
    padding: '18px 16px',
    textAlign: 'left',
    transition: 'all 0.2s',
    position: 'relative',
  },
  menuIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    marginBottom: '10px',
  },
  menuNum: { fontSize: '10px', fontWeight: 700, color: '#a0aec0', marginBottom: '3px', letterSpacing: '1px' },
  menuTitle: { fontSize: '15px', fontWeight: 800, color: '#1a202c', marginBottom: '5px' },
  menuDesc: { fontSize: '12px', color: '#718096', lineHeight: 1.4 },
  lockBadge: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '3px 8px',
    fontSize: '10px',
    color: '#a0aec0',
  },
}
