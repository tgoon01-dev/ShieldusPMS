import React, { useState } from 'react'
import { useStore } from '../store'
import { loadUserData } from '../lib/supabase'

const BUSINESSES = ['물리보안', '사이버보안', '인프라보안', '경영지원']

export default function Screen1_Login({ onNext }) {
  const [business, setBusiness] = useState('')
  const [department, setDepartment] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [loadingUser, setLoadingUser] = useState(false)
  const { initUser, allData } = useStore()

  const handleEmailBlur = async () => {
    if (!email.trim()) return
    // 로컬 캐시 우선 확인
    if (allData[email.trim()]?.profile) {
      const p = allData[email.trim()].profile
      setBusiness(p.business || '')
      setDepartment(p.department || '')
      setName(p.name || '')
      setAutoFilled(true)
      return
    }
    // Supabase에서 불러오기
    setLoadingUser(true)
    let remote = null
    try {
      remote = await loadUserData(email.trim())
    } catch (e) {
      console.warn('Supabase 연결 실패:', e)
    }
    setLoadingUser(false)
    if (remote?.profile) {
      setBusiness(remote.profile.business || '')
      setDepartment(remote.profile.department || '')
      setName(remote.profile.name || '')
      setAutoFilled(true)
    } else {
      setAutoFilled(false)
    }
  }

  const handleStart = async () => {
    if (!business || !department || !name || !email) return
    const profile = { email: email.trim(), business, department, name: name.trim() }
    let remote = null
    try {
      remote = await loadUserData(email.trim())
    } catch (e) {
      console.warn('Supabase 연결 실패, 로컬 데이터로 진행합니다.', e)
    }
    initUser(email.trim(), profile, remote)
    onNext()
  }

  const autoStyle = autoFilled
    ? { borderColor: '#68d391', background: '#f0fff4' }
    : {}

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>S</div>
          <div>
            <div style={styles.logoTitle}>SKShieldus</div>
            <div style={styles.logoSub}>성과관리 시스템</div>
          </div>
        </div>

        {/* 이메일 — 최상단 */}
        <div style={styles.field}>
          <label style={styles.label}>이메일 주소</label>
          <input
            style={styles.input}
            placeholder="name@skshieldus.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setAutoFilled(false) }}
            onBlur={handleEmailBlur}
          />
          {loadingUser ? (
            <div style={styles.hint}>⏳ 저장된 정보를 불러오는 중...</div>
          ) : (
            <div style={styles.hint}>
              이메일을 기준으로 데이터가 저장됩니다.
              재접속 시 이메일을 입력하면 사업·부서·성명이 자동으로 채워집니다.
            </div>
          )}
        </div>

        {autoFilled && (
          <div style={styles.autoFilledBanner}>
            ✅ 이전에 저장된 정보를 자동으로 불러왔습니다. 필요 시 수정할 수 있습니다.
          </div>
        )}

        {/* 사업 선택 */}
        <div style={styles.field}>
          <label style={styles.label}>사업 선택</label>
          <div style={styles.businessGrid}>
            {BUSINESSES.map(b => (
              <button
                key={b}
                style={{
                  ...styles.businessBtn,
                  ...(business === b ? styles.businessBtnActive : {}),
                  ...(autoFilled && business === b ? { borderColor: '#68d391' } : {}),
                }}
                onClick={() => setBusiness(b)}
              >
                {b === '물리보안' && '🔒 '}
                {b === '사이버보안' && '🛡️ '}
                {b === '인프라보안' && '🏗️ '}
                {b === '경영지원' && '📊 '}
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* 부서명 */}
        <div style={styles.field}>
          <label style={styles.label}>부서명</label>
          <input
            style={{ ...styles.input, ...autoStyle }}
            placeholder="예: 영업1팀, 기술지원팀"
            value={department}
            onChange={e => setDepartment(e.target.value)}
          />
        </div>

        {/* 성명 */}
        <div style={styles.field}>
          <label style={styles.label}>성명</label>
          <input
            style={{ ...styles.input, ...autoStyle }}
            placeholder="예: 홍길동"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <button
          style={{
            ...styles.startBtn,
            ...(!business || !department || !name || !email ? styles.startBtnDisabled : {})
          }}
          onClick={handleStart}
          disabled={!business || !department || !name || !email}
        >
          성과관리 시작 →
        </button>
      </div>
    </div>
  )
}

const styles = {
  bg: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '36px',
  },
  logoIcon: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #e53e3e, #c53030)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 900,
    color: 'white',
  },
  logoTitle: { fontSize: '22px', fontWeight: 800, color: '#1a202c' },
  logoSub: { fontSize: '13px', color: '#718096', marginTop: '2px' },
  autoFilledBanner: {
    background: '#f0fff4',
    border: '1px solid #9ae6b4',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '20px',
    fontSize: '13px',
    color: '#276749',
    lineHeight: 1.5,
  },
  field: { marginBottom: '22px' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: '#4a5568',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  hint: { fontSize: '12px', color: '#a0aec0', marginTop: '6px' },
  businessGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  businessBtn: {
    padding: '12px 8px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4a5568',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  businessBtnActive: {
    borderColor: '#e53e3e',
    background: '#fff5f5',
    color: '#e53e3e',
  },
  startBtn: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #e53e3e, #c53030)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'opacity 0.2s',
  },
  startBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
}
