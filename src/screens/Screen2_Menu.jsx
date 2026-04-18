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

function getRate(goal) {
  const val = (goal.currentValue !== null && goal.currentValue !== undefined)
    ? Number(goal.currentValue) : null
  const target = Number(goal.kpi?.targetValue ?? goal.targetValue)
  if (val === null || isNaN(val) || isNaN(target) || target === 0) return null
  return Math.min(Math.round((val / target) * 100), 100)
}

const NAVY_TRACK = '#d0daea'   // 옅은 남색 (100% 배경)
const NAVY_FILL  = '#2c5282'   // 짙은 남색 (달성 채움)
const PLACEHOLDER_WIDTHS = [68, 52, 38]

function KpiDashboard({ goals, onGoToGoals }) {
  const isEmpty = !goals || goals.length === 0
  const rates = isEmpty ? [] : goals.map(g => getRate(g))
  const withData = rates.filter(r => r !== null)
  const avgRate = withData.length > 0
    ? Math.round(withData.reduce((a, b) => a + b, 0) / withData.length)
    : null

  return (
    <div style={db.card}>
      {/* 헤더 */}
      <div style={db.topRow}>
        <div style={db.cardTitle}>📈 KPI 달성 현황</div>
        {!isEmpty && (
          <div style={db.summary}>
            <span style={db.summaryText}>총 {goals.length}개</span>
            <span style={db.summaryDot}>·</span>
            <span style={db.summaryText}>측정 완료 {withData.length}개</span>
            {avgRate !== null && (
              <>
                <span style={db.summaryDot}>·</span>
                <span style={{ ...db.summaryText, color: NAVY_FILL, fontWeight: 700 }}>평균 {avgRate}%</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 빈 상태: 플레이스홀더 */}
      {isEmpty && (
        <div style={db.emptyWrap}>
          {PLACEHOLDER_WIDTHS.map((w, i) => (
            <div key={i} style={db.placeholderRow}>
              <div style={db.placeholderLabel} />
              <div style={db.placeholderTrack}>
                <div style={{ ...db.placeholderFill, width: `${w}%` }} />
              </div>
              <div style={db.placeholderPct} />
            </div>
          ))}
          <div style={db.emptyOverlay}>
            <span style={db.emptyOverlayIcon}>📋</span>
            <span style={db.emptyOverlayText}>목표를 설정해 주십시오.</span>
            <button style={db.emptyOverlayBtn} onClick={onGoToGoals}>목표 설정하러 가기 →</button>
          </div>
        </div>
      )}

      {/* KPI 가로 바 */}
      {!isEmpty && (
        <div style={db.kpiList}>
          {goals.map((goal, idx) => {
            const rate = getRate(goal)
            const title = goal.kpi?.title ?? goal.title ?? ''
            const targetValue = goal.kpi?.targetValue ?? goal.targetValue ?? ''
            const unit = goal.kpi?.unit ?? goal.unit ?? ''
            const assignees = goal.assignees || []
            return (
              <div key={goal.id} style={db.kpiRow}>
                {/* 좌: 이름 + 담당자 */}
                <div style={db.kpiLeft}>
                  <div style={db.kpiTitle}>{title}</div>
                  <div style={db.kpiAssignees}>
                    {assignees.length > 0
                      ? assignees.map((a, i) => (
                          <span key={i} style={db.assigneeChip}>{a}</span>
                        ))
                      : <span style={db.noAssignee}>담당자 미배정</span>
                    }
                  </div>
                </div>
                {/* 우: 바 + 수치 */}
                <div style={db.kpiRight}>
                  <div style={db.barWrap}>
                    <div style={db.barTrack}>
                      <div style={{
                        ...db.barFill,
                        width: rate !== null ? `${rate}%` : '0%',
                      }} />
                    </div>
                    <span style={db.barPct}>
                      {rate !== null
                        ? `${rate}%`
                        : <span style={db.noData}>미입력</span>}
                    </span>
                  </div>
                  {rate !== null && (
                    <div style={db.valueText}>
                      {goal.currentValue}{unit} / {targetValue}{unit}
                    </div>
                  )}
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
    marginBottom: '14px',
  },
  cardTitle: { fontSize: '14px', fontWeight: 700, color: '#2d3748' },
  summary: { display: 'flex', alignItems: 'center', gap: '6px' },
  summaryText: { fontSize: '12px', color: '#718096' },
  summaryDot: { fontSize: '12px', color: '#cbd5e0' },

  // 빈 상태
  emptyWrap: { position: 'relative', padding: '4px 0 8px' },
  placeholderRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  placeholderLabel: { width: '130px', height: '32px', background: '#edf2f7', borderRadius: '6px', flexShrink: 0 },
  placeholderTrack: { flex: 1, height: '10px', background: '#edf2f7', borderRadius: '999px', overflow: 'hidden' },
  placeholderFill: { height: '100%', background: NAVY_TRACK, borderRadius: '999px' },
  placeholderPct: { width: '34px', height: '16px', background: '#edf2f7', borderRadius: '4px', flexShrink: 0 },
  emptyOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
    background: 'rgba(247,250,252,0.9)', borderRadius: '8px',
  },
  emptyOverlayIcon: { fontSize: '22px' },
  emptyOverlayText: { fontSize: '13px', fontWeight: 600, color: '#718096' },
  emptyOverlayBtn: {
    marginTop: '4px', padding: '6px 16px',
    background: NAVY_FILL, color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  },

  // KPI 행
  kpiList: { display: 'flex', flexDirection: 'column', gap: '0px' },
  kpiRow: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '10px 0',
    borderBottom: '1px solid #f0f4f8',
  },
  kpiLeft: { width: '200px', flexShrink: 0 },
  kpiTitle: { fontSize: '13px', fontWeight: 700, color: '#1a202c', marginBottom: '5px', lineHeight: 1.3 },
  kpiAssignees: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  assigneeChip: {
    fontSize: '11px', color: '#4a5568',
    background: '#edf2f7', borderRadius: '10px',
    padding: '1px 7px',
  },
  noAssignee: { fontSize: '11px', color: '#cbd5e0', fontStyle: 'italic' },

  kpiRight: { flex: 1, minWidth: 0 },
  barWrap: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' },
  barTrack: {
    flex: 1, height: '12px',
    background: NAVY_TRACK,
    borderRadius: '999px', overflow: 'hidden',
  },
  barFill: {
    height: '100%', borderRadius: '999px',
    background: NAVY_FILL,
    transition: 'width 0.5s ease',
  },
  barPct: { fontSize: '13px', fontWeight: 800, color: NAVY_FILL, width: '38px', textAlign: 'right', flexShrink: 0 },
  valueText: { fontSize: '11px', color: '#a0aec0' },
  noData: { fontSize: '11px', color: '#cbd5e0', fontStyle: 'italic', fontWeight: 400 },
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
