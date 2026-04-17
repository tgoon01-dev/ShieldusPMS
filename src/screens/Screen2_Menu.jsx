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
  const val = (goal.currentValue !== null && goal.currentValue !== undefined)
    ? Number(goal.currentValue) : null
  const target = Number(goal.targetValue)
  if (val === null || isNaN(val) || isNaN(target) || target === 0) return null
  return Math.min(Math.round((val / target) * 100), 200)
}

function rateColor(rate) {
  if (rate === null) return '#a0aec0'
  if (rate >= 80) return '#38a169'
  if (rate >= 50) return '#dd6b20'
  return '#e53e3e'
}

function rateBg(rate) {
  if (rate === null) return '#f7fafc'
  if (rate >= 80) return '#f0fff4'
  if (rate >= 50) return '#fffaf0'
  return '#fff5f5'
}

const PLACEHOLDER_WIDTHS = [72, 55, 40]

function KpiDashboard({ goals, onGoToGoals }) {
  const isEmpty = !goals || goals.length === 0

  const rates = isEmpty ? [] : goals.map(g => getAchievementRate(g))
  const withData = rates.filter(r => r !== null)
  const avgRate = withData.length > 0
    ? Math.round(withData.reduce((a, b) => a + b, 0) / withData.length)
    : null

  return (
    <div style={db.card}>
      {/* Header row */}
      <div style={db.topRow}>
        <div style={db.cardTitle}>📈 KPI 달성 현황</div>
        {!isEmpty && (
          <div style={db.summary}>
            <div style={db.summaryItem}>
              <span style={db.summaryNum}>{goals.length}</span>
              <span style={db.summaryLabel}>전체</span>
            </div>
            <div style={db.vDivider} />
            <div style={db.summaryItem}>
              <span style={db.summaryNum}>{withData.length}</span>
              <span style={db.summaryLabel}>측정 완료</span>
            </div>
            <div style={db.vDivider} />
            <div style={db.summaryItem}>
              <span style={{ ...db.summaryNum, color: avgRate !== null ? rateColor(avgRate) : '#a0aec0' }}>
                {avgRate !== null ? `${avgRate}%` : '-'}
              </span>
              <span style={db.summaryLabel}>평균 달성률</span>
            </div>
          </div>
        )}
      </div>

      {/* Overall average bar (only when data exists) */}
      {!isEmpty && avgRate !== null && (
        <div style={db.overallWrap}>
          <div style={db.overallLabelRow}>
            <span style={db.overallCaption}>전체 평균</span>
            <span style={{ ...db.overallPct, color: rateColor(avgRate) }}>{avgRate}%</span>
          </div>
          <div style={db.overallTrack}>
            <div style={{ ...db.overallFill, width: `${Math.min(avgRate, 100)}%`, background: rateColor(avgRate) }} />
          </div>
        </div>
      )}

      {/* Empty state: placeholder bars */}
      {isEmpty && (
        <div style={db.emptyWrap}>
          {PLACEHOLDER_WIDTHS.map((w, i) => (
            <div key={i} style={db.placeholderRow}>
              <div style={db.placeholderLabel} />
              <div style={db.placeholderTrack}>
                <div style={{ ...db.placeholderFill, width: `${w}%` }} />
              </div>
              <div style={db.placeholderBadge} />
            </div>
          ))}
          <div style={db.emptyOverlay}>
            <span style={db.emptyOverlayIcon}>📋</span>
            <span style={db.emptyOverlayText}>목표를 설정해 주십시오.</span>
            <button style={db.emptyOverlayBtn} onClick={onGoToGoals}>목표 설정하러 가기 →</button>
          </div>
        </div>
      )}

      {/* KPI rows */}
      {!isEmpty && (
        <div style={db.kpiList}>
          {goals.map(goal => {
            const rate = getAchievementRate(goal)
            const color = rateColor(rate)
            const bg = rateBg(rate)
            return (
              <div key={goal.id} style={{ ...db.kpiRow, background: bg }}>
                <div style={db.kpiLeft}>
                  {goal.perspective && <div style={db.kpiPersp}>{goal.perspective}</div>}
                  <div style={db.kpiTitle}>{goal.title}</div>
                  <div style={db.kpiSub}>
                    {rate !== null
                      ? <>{goal.currentValue}{goal.unit} <span style={db.slash}>/</span> 목표 {goal.targetValue}{goal.unit}</>
                      : <span style={db.noData}>달성 현황 미입력</span>}
                  </div>
                </div>
                <div style={db.kpiRight}>
                  <div style={{ ...db.badge, color, borderColor: color + '55' }}>
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
      )}
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
                <div style={styles.cardInner}>
                  <div style={{ ...styles.menuIcon, background: enabled ? item.bgColor : '#f7fafc', color: item.color }}>
                    {item.icon}
                  </div>
                  <div style={styles.menuText}>
                    <div style={styles.menuNumRow}>
                      <span style={styles.menuNum}>{item.num}</span>
                      {!enabled && <span style={styles.lockChip}>목표 설정 후 활성화</span>}
                    </div>
                    <div style={styles.menuTitle}>{item.title}</div>
                    <div style={styles.menuDesc}>{item.desc}</div>
                  </div>
                </div>
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
    padding: '18px 20px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cardTitle: { fontSize: '14px', fontWeight: 700, color: '#2d3748' },
  summary: { display: 'flex', alignItems: 'center', gap: '10px' },
  summaryItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' },
  summaryNum: { fontSize: '17px', fontWeight: 800, color: '#2d3748' },
  summaryLabel: { fontSize: '10px', color: '#a0aec0', fontWeight: 600 },
  vDivider: { width: '1px', height: '26px', background: '#e2e8f0' },
  overallWrap: { marginBottom: '12px' },
  overallLabelRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  overallCaption: { fontSize: '11px', color: '#a0aec0' },
  overallPct: { fontSize: '12px', fontWeight: 700 },
  overallTrack: {
    height: '8px',
    background: '#edf2f7',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  overallFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.6s ease',
  },
  emptyWrap: {
    position: 'relative',
    padding: '8px 0',
  },
  placeholderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  placeholderLabel: {
    width: '120px',
    height: '10px',
    background: '#edf2f7',
    borderRadius: '4px',
    flexShrink: 0,
  },
  placeholderTrack: {
    flex: 1,
    height: '10px',
    background: '#edf2f7',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  placeholderFill: {
    height: '100%',
    background: '#e2e8f0',
    borderRadius: '999px',
  },
  placeholderBadge: {
    width: '38px',
    height: '20px',
    background: '#edf2f7',
    borderRadius: '6px',
    flexShrink: 0,
  },
  emptyOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'rgba(247,250,252,0.88)',
    borderRadius: '8px',
  },
  emptyOverlayIcon: { fontSize: '22px' },
  emptyOverlayText: { fontSize: '13px', fontWeight: 600, color: '#718096' },
  emptyOverlayBtn: {
    marginTop: '4px',
    padding: '6px 16px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  kpiList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  kpiRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '8px',
  },
  kpiLeft: { flex: 1, minWidth: 0 },
  kpiPersp: { fontSize: '9px', color: '#a0aec0', fontWeight: 700, marginBottom: '1px', textTransform: 'uppercase' },
  kpiTitle: { fontSize: '13px', fontWeight: 700, color: '#2d3748', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  kpiSub: { fontSize: '11px', color: '#718096', marginTop: '2px' },
  slash: { color: '#cbd5e0' },
  noData: { color: '#cbd5e0', fontStyle: 'italic' },
  kpiRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', marginLeft: '12px', minWidth: '90px' },
  badge: {
    fontSize: '12px',
    fontWeight: 800,
    border: '1px solid',
    borderRadius: '5px',
    padding: '1px 7px',
    background: 'white',
  },
  barTrack: { width: '80px', height: '5px', background: '#edf2f7', borderRadius: '999px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '999px', transition: 'width 0.4s ease' },
}

const styles = {
  bg: {
    minHeight: '100vh',
    background: '#f0f4f8',
    padding: '20px',
  },
  container: { maxWidth: '900px', margin: '0 auto' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    background: 'white',
    padding: '16px 20px',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  greeting: { fontSize: '19px', fontWeight: 700, color: '#1a202c' },
  sub: { fontSize: '12px', color: '#718096', marginTop: '3px' },
  logoutBtn: {
    padding: '6px 13px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#718096',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#a0aec0',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  menuCard: {
    background: 'white',
    border: '2px solid',
    borderRadius: '12px',
    padding: '14px 14px',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  cardInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  menuIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  menuText: { flex: 1, minWidth: 0 },
  menuNumRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' },
  menuNum: { fontSize: '10px', fontWeight: 700, color: '#a0aec0', letterSpacing: '1px' },
  lockChip: {
    fontSize: '9px',
    color: '#a0aec0',
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '1px 6px',
  },
  menuTitle: { fontSize: '14px', fontWeight: 800, color: '#1a202c', marginBottom: '2px' },
  menuDesc: { fontSize: '11px', color: '#718096', lineHeight: 1.3 },
}
