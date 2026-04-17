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

export default function Screen2_Menu({ onSelect, onLogout }) {
  const getProfile = useStore(s => s.getProfile)
  const getGoals = useStore(s => s.getGoals)
  const profile = getProfile()
  const goals = getGoals()
  const hasGoals = goals.length > 0
  const hasCurrentValues = goals.some(g => g.currentValue !== null && g.currentValue !== undefined)

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
            <div style={styles.greeting}>안녕하세요, {profile.department} 팀장님 👋</div>
            <div style={styles.sub}>{profile.business} · {profile.email}</div>
          </div>
          <button style={styles.logoutBtn} onClick={onLogout}>로그아웃</button>
        </div>

        <div style={styles.progress}>
          <div style={styles.progressTitle}>진행 현황</div>
          <div style={styles.progressRow}>
            <div style={styles.progressItem}>
              <div style={{ ...styles.progressDot, background: hasGoals ? '#48bb78' : '#e2e8f0' }} />
              <span>KPI {goals.length}개 설정됨</span>
            </div>
            <div style={styles.progressItem}>
              <div style={{ ...styles.progressDot, background: hasCurrentValues ? '#48bb78' : '#e2e8f0' }} />
              <span>중간 관리 {hasCurrentValues ? '입력 완료' : '미완료'}</span>
            </div>
          </div>
        </div>

        <div style={styles.title}>어떤 기능을 사용하시겠어요?</div>

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
                  <div style={styles.lockBadge}>
                    {item.id === 'mid-review' ? '목표 설정 후 활성화' : '중간 관리 후 활성화'}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
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
    marginBottom: '24px',
    background: 'white',
    padding: '20px 24px',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  greeting: { fontSize: '20px', fontWeight: 700, color: '#1a202c' },
  sub: { fontSize: '13px', color: '#718096', marginTop: '4px' },
  logoutBtn: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#718096',
  },
  progress: {
    background: 'white',
    padding: '16px 24px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  progressTitle: { fontSize: '12px', fontWeight: 700, color: '#a0aec0', marginBottom: '10px', textTransform: 'uppercase' },
  progressRow: { display: 'flex', gap: '24px' },
  progressItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4a5568' },
  progressDot: { width: '10px', height: '10px', borderRadius: '50%' },
  title: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#1a202c',
    marginBottom: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  menuCard: {
    background: 'white',
    border: '2px solid',
    borderRadius: '16px',
    padding: '28px 24px',
    textAlign: 'left',
    transition: 'all 0.2s',
    position: 'relative',
  },
  menuIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    marginBottom: '16px',
  },
  menuNum: { fontSize: '11px', fontWeight: 700, color: '#a0aec0', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' },
  menuTitle: { fontSize: '18px', fontWeight: 800, color: '#1a202c', marginBottom: '8px' },
  menuDesc: { fontSize: '13px', color: '#718096', lineHeight: 1.5 },
  lockBadge: {
    position: 'absolute',
    bottom: '16px',
    right: '16px',
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '4px 10px',
    fontSize: '11px',
    color: '#a0aec0',
  },
}
