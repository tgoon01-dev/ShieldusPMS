import React, { useState, useRef } from 'react'
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../store'
import { generateKpiSuggestions, checkTaskSpecificity } from '../api/claude'

function SortableKpiRow({ goal, index, members, onAssign, onRemoveAssignee, onChangeMonth }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const isPending = index >= 10

  return (
    <div ref={setNodeRef} style={{ ...rowStyles.row, ...style, borderLeft: isPending ? '4px solid #e2e8f0' : `4px solid #4299e1` }}>
      <div style={rowStyles.handle} {...attributes} {...listeners}>⠿</div>
      <div style={rowStyles.rank}>
        {isPending ? <span style={rowStyles.pendingBadge}>보류</span> : <span style={rowStyles.rankNum}>{index + 1}</span>}
      </div>
      <div style={rowStyles.content}>
        <div style={rowStyles.kpiTitle}>{goal.kpi.title}</div>
        <div style={rowStyles.kpiMeta}>
          목표: {goal.kpi.targetValue}{goal.kpi.unit} · {goal.kpi.measurement}
        </div>
      </div>
      {/* 종료 월 드롭다운 */}
      <select
        style={{
          ...rowStyles.monthSelect,
          color: goal.deadlineMonth ? '#2d3748' : '#a0aec0',
          borderColor: goal.deadlineMonth ? '#68d391' : '#e2e8f0',
          background: goal.deadlineMonth ? '#f0fff4' : 'white',
        }}
        value={goal.deadlineMonth || ''}
        onChange={e => onChangeMonth(goal.id, e.target.value ? parseInt(e.target.value) : null)}
      >
        <option value="">종료 월</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
          <option key={m} value={m}>{m}월</option>
        ))}
      </select>
      {/* 담당자 */}
      <div style={rowStyles.assignees}>
        {(goal.assignees || []).map(name => (
          <div key={name} style={rowStyles.assigneeBadge}>
            {name}
            <button style={rowStyles.removeBtn} onClick={() => onRemoveAssignee(goal.id, name)}>×</button>
          </div>
        ))}
        <select
          style={rowStyles.assignSelect}
          value=""
          onChange={e => e.target.value && onAssign(goal.id, e.target.value)}
        >
          <option value="">+ 담당자</option>
          {members.filter(m => !(goal.assignees || []).includes(m)).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function Screen3_Goals({ onBack }) {
  const { getGoals, getMembers, getProfile, setGoals, addGoal, addMember } = useStore()
  const goals = getGoals()
  const members = getMembers()
  const profile = getProfile()

  const [taskInput, setTaskInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const [specificity, setSpecificity] = useState(null)
  const [memberInput, setMemberInput] = useState('')
  const [manualForm, setManualForm] = useState(false)
  const [manualKpi, setManualKpi] = useState({ title: '', targetValue: '', unit: '', period: '', measurement: '' })
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleGenerate = async (force = false) => {
    if (!taskInput.trim()) return
    const check = checkTaskSpecificity(taskInput)
    if (!check.isSpecific && !force) {
      setSpecificity(check)
      return
    }
    setSpecificity(null)
    setLoading(true)
    setError('')
    try {
      const result = await generateKpiSuggestions(taskInput, profile.business, profile.department)
      setSuggestions({ task: taskInput, items: result.suggestions })
    } catch (e) {
      setError('KPI 생성 중 오류가 발생했습니다: ' + e.message)
    }
    setLoading(false)
  }

  const handleSelectKpi = (suggestion) => {
    const newGoal = {
      id: Date.now().toString(),
      task: suggestions.task,
      kpi: {
        title: suggestion.title,
        description: suggestion.description,
        targetValue: suggestion.targetValue,
        unit: suggestion.unit,
        period: suggestion.period,
        measurement: suggestion.measurement,
      },
      assignees: [],
      currentValue: null,
      scores: { strategicImportance: 3, difficulty: 3, contribution: 3 }
    }
    addGoal(newGoal)
    setSuggestions(null)
    setTaskInput('')
  }

  const handleAddManual = () => {
    if (!manualKpi.title) return
    const newGoal = {
      id: Date.now().toString(),
      task: taskInput || '직접 입력',
      kpi: { ...manualKpi },
      assignees: [],
      currentValue: null,
      scores: { strategicImportance: 3, difficulty: 3, contribution: 3 }
    }
    addGoal(newGoal)
    setManualForm(false)
    setManualKpi({ title: '', targetValue: '', unit: '', period: '', measurement: '' })
    setTaskInput('')
    setSuggestions(null)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)
    if (active.id !== over?.id) {
      const oldIndex = goals.findIndex(g => g.id === active.id)
      const newIndex = goals.findIndex(g => g.id === over.id)
      setGoals(arrayMove(goals, oldIndex, newIndex))
    }
  }

  const handleAssign = (goalId, name) => {
    const updated = goals.map(g =>
      g.id === goalId ? { ...g, assignees: [...(g.assignees || []), name] } : g
    )
    setGoals(updated)
  }

  const handleRemoveAssignee = (goalId, name) => {
    const updated = goals.map(g =>
      g.id === goalId ? { ...g, assignees: (g.assignees || []).filter(a => a !== name) } : g
    )
    setGoals(updated)
  }

  const handleChangeMonth = (goalId, month) => {
    const updated = goals.map(g =>
      g.id === goalId ? { ...g, deadlineMonth: month } : g
    )
    setGoals(updated)
  }

  const handleAddMember = () => {
    if (memberInput.trim()) {
      addMember(memberInput.trim())
      setMemberInput('')
    }
  }

  const pendingCount = Math.max(0, goals.length - 10)

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>← 뒤로</button>
          <div>
            <h1 style={styles.title}>🎯 목표 설정</h1>
            <div style={styles.sub}>KPI를 수립하고 구성원에게 배정하세요</div>
          </div>
          <div style={styles.statsBox}>
            <span>총 {goals.length}개</span>
            {pendingCount > 0 && <span style={{ color: '#a0aec0' }}>· 보류 {pendingCount}개</span>}
          </div>
        </div>

        {/* KPI Board */}
        {goals.length > 0 && (
          <div style={styles.boardCard}>
            <div style={styles.boardHeader}>
              <span style={styles.boardTitle}>📋 KPI 관리 보드</span>
              <span style={styles.boardHint}>⠿ 드래그하여 우선순위 변경</span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={e => setActiveId(e.active.id)}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
                {goals.map((goal, i) => (
                  <SortableKpiRow
                    key={goal.id}
                    goal={goal}
                    index={i}
                    members={members}
                    onAssign={handleAssign}
                    onRemoveAssignee={handleRemoveAssignee}
                    onChangeMonth={handleChangeMonth}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Input area */}
        <div style={styles.inputCard}>
          <div style={styles.inputTitle}>KPI 추가를 위한 업무 입력</div>
          <div style={styles.inputSubtitle}>업무를 풍부하게 설명해주시면 더 구체적인 KPI를 추천받을 수 있습니다.</div>

          {/* Specificity hint */}
          {specificity && !specificity.isSpecific && (
            <div style={styles.hintBox}>
              <div>💡 {specificity.hint}</div>
              {specificity.example && <div style={{ marginTop: '6px', color: '#718096' }}>예: {specificity.example}</div>}
              <button style={styles.forceBtn} onClick={() => handleGenerate(true)}>그냥 생성하기</button>
            </div>
          )}

          <div style={styles.guideBox}>
            <div style={styles.guideTitle}>💡 더 좋은 KPI를 받으려면</div>
            <div style={styles.guideItems}>
              <span>• 어떤 결과물을 만드는 업무인가요?</span>
              <span>• 측정 가능한 수치가 있나요?</span>
              <span>• 언제까지 완료해야 하나요?</span>
            </div>
          </div>

          <div style={styles.inputRow}>
            <textarea
              style={styles.textarea}
              placeholder="예: 중소기업 대상 네트워크 보안 취약점 점검 보고서 월 10건 작성"
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
              rows={2}
            />
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.btnRow}>
            <button
              style={{ ...styles.generateBtn, opacity: loading || !taskInput ? 0.5 : 1 }}
              onClick={() => handleGenerate(false)}
              disabled={loading || !taskInput}
            >
              {loading ? '⏳ KPI 생성 중...' : '✨ KPI 추천 받기'}
            </button>
            <button style={styles.manualBtn} onClick={() => setManualForm(!manualForm)}>
              ✏️ 직접 입력
            </button>
          </div>

          {/* Manual form */}
          {manualForm && (
            <div style={styles.manualForm}>
              <input style={styles.manualInput} placeholder="KPI명" value={manualKpi.title} onChange={e => setManualKpi({ ...manualKpi, title: e.target.value })} />
              <div style={styles.manualRow}>
                <input style={{ ...styles.manualInput, flex: 2 }} placeholder="목표값 (예: 10)" value={manualKpi.targetValue} onChange={e => setManualKpi({ ...manualKpi, targetValue: e.target.value })} />
                <input style={{ ...styles.manualInput, flex: 1 }} placeholder="단위 (건, %)" value={manualKpi.unit} onChange={e => setManualKpi({ ...manualKpi, unit: e.target.value })} />
              </div>
              <input style={styles.manualInput} placeholder="기간 (예: 2025년 2분기)" value={manualKpi.period} onChange={e => setManualKpi({ ...manualKpi, period: e.target.value })} />
              <input style={styles.manualInput} placeholder="측정 방법" value={manualKpi.measurement} onChange={e => setManualKpi({ ...manualKpi, measurement: e.target.value })} />
              <button style={styles.addManualBtn} onClick={handleAddManual}>보드에 추가</button>
            </div>
          )}

          {/* Suggestions */}
          {suggestions && (
            <div style={styles.suggestionsBox}>
              <div style={styles.suggestTitle}>💡 "{suggestions.task}" 에 대한 KPI 제안</div>
              {suggestions.items.map((s, i) => (
                <div key={i} style={styles.suggestCard}>
                  <div style={styles.suggestPerspective}>{['①', '②', '③'][i]} {s.perspective}</div>
                  <div style={styles.suggestKpiTitle}>{s.title}</div>
                  <div style={styles.suggestDesc}>{s.description}</div>
                  <div style={styles.suggestMeta}>
                    <span>🎯 {s.targetValue}{s.unit}</span>
                    <span>📅 {s.period}</span>
                    <span>📏 {s.measurement}</span>
                  </div>
                  <button style={styles.selectBtn} onClick={() => handleSelectKpi(s)}>이걸로 추가</button>
                </div>
              ))}
              <div style={styles.suggestFooter}>
                <button style={styles.retryBtn} onClick={() => handleGenerate(true)}>↻ 다른 제안 받기</button>
                <button style={styles.cancelBtn} onClick={() => setSuggestions(null)}>취소</button>
              </div>
            </div>
          )}
        </div>

        {/* Member panel */}
        <div style={styles.memberCard}>
          <div style={styles.memberTitle}>👥 구성원 관리</div>
          <div style={styles.memberInputRow}>
            <input
              style={styles.memberInput}
              placeholder="구성원 이름 입력"
              value={memberInput}
              onChange={e => setMemberInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMember()}
            />
            <button style={styles.addMemberBtn} onClick={handleAddMember}>추가</button>
          </div>
          <div style={styles.memberList}>
            {members.map(m => (
              <div key={m} style={styles.memberChip}>{m}</div>
            ))}
          </div>
        </div>

        {/* Confirm */}
        {goals.length > 0 && (
          <button style={styles.confirmBtn} onClick={onBack}>
            ✅ 목표 확정 ({goals.length}개) → 메인으로
          </button>
        )}
      </div>
    </div>
  )
}

const rowStyles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #f7fafc',
    gap: '12px',
    background: 'white',
    borderRadius: '8px',
    marginBottom: '6px',
    cursor: 'default',
  },
  handle: { cursor: 'grab', color: '#cbd5e0', fontSize: '20px', lineHeight: 1, userSelect: 'none' },
  rank: { width: '36px', textAlign: 'center', flexShrink: 0 },
  rankNum: { width: '28px', height: '28px', background: '#4299e1', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, margin: '0 auto' },
  pendingBadge: { background: '#f7fafc', color: '#a0aec0', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3px 8px', fontSize: '11px' },
  content: { flex: 1 },
  kpiTitle: { fontSize: '14px', fontWeight: 700, color: '#2d3748', marginBottom: '3px' },
  kpiMeta: { fontSize: '12px', color: '#718096' },
  monthSelect: { padding: '4px 8px', border: '1px solid', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', outline: 'none', flexShrink: 0 },
  assignees: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' },
  assigneeBadge: { background: '#ebf8ff', color: '#2b6cb0', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' },
  removeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', fontSize: '14px', lineHeight: 1, padding: '0 2px' },
  assignSelect: { padding: '4px 8px', border: '1px dashed #bee3f8', borderRadius: '20px', fontSize: '12px', color: '#4299e1', background: 'white', cursor: 'pointer' },
}

const styles = {
  bg: { minHeight: '100vh', background: '#f0f4f8', padding: '24px' },
  container: { maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  backBtn: { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#718096' },
  title: { fontSize: '22px', fontWeight: 800, color: '#1a202c' },
  sub: { fontSize: '13px', color: '#718096', marginTop: '2px' },
  statsBox: { display: 'flex', gap: '8px', fontSize: '14px', color: '#4a5568', fontWeight: 600 },
  boardCard: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  boardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '14px' },
  boardTitle: { fontWeight: 700, color: '#2d3748' },
  boardHint: { fontSize: '12px', color: '#a0aec0' },
  inputCard: { background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  inputTitle: { fontSize: '16px', fontWeight: 700, color: '#2d3748', marginBottom: '6px' },
  inputSubtitle: { fontSize: '13px', color: '#718096', marginBottom: '16px' },
  hintBox: { background: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '10px', padding: '14px', marginBottom: '14px', fontSize: '13px', color: '#744210' },
  forceBtn: { marginTop: '10px', padding: '6px 14px', background: '#ed8936', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  guideBox: { background: '#f7fafc', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px' },
  guideTitle: { fontSize: '12px', fontWeight: 700, color: '#4a5568', marginBottom: '8px' },
  guideItems: { display: 'flex', gap: '16px', fontSize: '12px', color: '#718096', flexWrap: 'wrap' },
  inputRow: { marginBottom: '12px' },
  textarea: { width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'inherit' },
  errorBox: { background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', padding: '10px', color: '#c53030', fontSize: '13px', marginBottom: '10px' },
  btnRow: { display: 'flex', gap: '10px' },
  generateBtn: { flex: 1, padding: '12px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
  manualBtn: { padding: '12px 20px', border: '2px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', color: '#4a5568' },
  manualForm: { marginTop: '16px', padding: '16px', background: '#f7fafc', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' },
  manualInput: { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  manualRow: { display: 'flex', gap: '8px' },
  addManualBtn: { padding: '10px', background: '#2d3748', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 },
  suggestionsBox: { marginTop: '20px', borderTop: '2px solid #e2e8f0', paddingTop: '16px' },
  suggestTitle: { fontSize: '14px', fontWeight: 700, color: '#4a5568', marginBottom: '14px' },
  suggestCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '10px', position: 'relative' },
  suggestPerspective: { fontSize: '11px', fontWeight: 700, color: '#4299e1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  suggestKpiTitle: { fontSize: '16px', fontWeight: 800, color: '#1a202c', marginBottom: '6px' },
  suggestDesc: { fontSize: '13px', color: '#718096', marginBottom: '10px', lineHeight: 1.5 },
  suggestMeta: { display: 'flex', gap: '14px', fontSize: '12px', color: '#4a5568', marginBottom: '12px', flexWrap: 'wrap' },
  selectBtn: { padding: '8px 20px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
  suggestFooter: { display: 'flex', gap: '10px', marginTop: '6px' },
  retryBtn: { padding: '10px 20px', background: '#ebf8ff', color: '#2b6cb0', border: '2px solid #bee3f8', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
  cancelBtn: { padding: '10px 16px', background: 'white', color: '#a0aec0', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  memberCard: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  memberTitle: { fontWeight: 700, color: '#2d3748', marginBottom: '12px' },
  memberInputRow: { display: 'flex', gap: '8px', marginBottom: '12px' },
  memberInput: { flex: 1, padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  addMemberBtn: { padding: '10px 18px', background: '#2d3748', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 },
  memberList: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  memberChip: { background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', color: '#4a5568' },
  confirmBtn: { width: '100%', padding: '18px', background: 'linear-gradient(135deg, #38a169, #276749)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' },
}
