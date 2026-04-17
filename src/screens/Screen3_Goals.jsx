import React, { useState } from 'react'
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../store'
import { generateCsfSuggestions, generateKpiFromCsf, checkTaskSpecificity } from '../api/claude'

const CSF_ICONS = ['🔑', '⚡', '🎯']
const CSF_COLORS = [
  { color: '#4299e1', bg: '#ebf8ff', border: '#bee3f8' },
  { color: '#48bb78', bg: '#f0fff4', border: '#9ae6b4' },
  { color: '#9f7aea', bg: '#faf5ff', border: '#d6bcfa' },
]

function SortableKpiRow({ goal, index, members, onAssign, onRemoveAssignee, onChangeMonth, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const isPending = index >= 10

  return (
    <div ref={setNodeRef} style={{ ...rowStyles.row, ...style, borderLeft: isPending ? '4px solid #e2e8f0' : '4px solid #4299e1' }}>
      <div style={rowStyles.handle} {...attributes} {...listeners}>⠿</div>
      <div style={rowStyles.rank}>
        {isPending
          ? <span style={rowStyles.pendingBadge}>보류</span>
          : <span style={rowStyles.rankNum}>{index + 1}</span>}
      </div>
      <div style={rowStyles.content}>
        <div style={rowStyles.kpiTitle}>{goal.kpi.title}</div>
        <div style={rowStyles.kpiMeta}>목표: {goal.kpi.targetValue}{goal.kpi.unit} · {goal.kpi.measurement}</div>
      </div>
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
      <div style={rowStyles.assignees}>
        {(goal.assignees || []).map(name => (
          <div key={name} style={rowStyles.assigneeBadge}>
            {name}
            <button style={rowStyles.removeBtn} onClick={() => onRemoveAssignee(goal.id, name)}>×</button>
          </div>
        ))}
        <select style={rowStyles.assignSelect} value="" onChange={e => e.target.value && onAssign(goal.id, e.target.value)}>
          <option value="">+ 담당자</option>
          {members.filter(m => !(goal.assignees || []).includes(m)).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <button style={rowStyles.editBtn} onClick={() => onEdit(goal)}>수정하기</button>
    </div>
  )
}

function EditModal({ goal, onSave, onClose }) {
  const [form, setForm] = useState({ ...goal.kpi })
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div style={modal.overlay}>
      <div style={modal.box}>
        <div style={modal.header}>
          <div style={modal.title}>✏️ KPI 수정</div>
          <button style={modal.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={modal.field}>
          <label style={modal.label}>KPI명</label>
          <input style={modal.input} value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div style={modal.field}>
          <label style={modal.label}>상세 설명</label>
          <textarea style={modal.textarea} value={form.description || ''} onChange={e => set('description', e.target.value)} rows={2} />
        </div>
        <div style={modal.row}>
          <div style={{ ...modal.field, flex: 2 }}>
            <label style={modal.label}>목표값</label>
            <input style={modal.input} value={form.targetValue} onChange={e => set('targetValue', e.target.value)} />
          </div>
          <div style={{ ...modal.field, flex: 1 }}>
            <label style={modal.label}>단위</label>
            <input style={modal.input} value={form.unit} onChange={e => set('unit', e.target.value)} />
          </div>
        </div>
        <div style={modal.field}>
          <label style={modal.label}>기간</label>
          <input style={modal.input} value={form.period} onChange={e => set('period', e.target.value)} />
        </div>
        <div style={modal.field}>
          <label style={modal.label}>측정 방법</label>
          <input style={modal.input} value={form.measurement} onChange={e => set('measurement', e.target.value)} />
        </div>
        <div style={modal.footer}>
          <button style={modal.cancelBtn} onClick={onClose}>취소</button>
          <button style={modal.saveBtn} onClick={() => onSave(goal.id, form)}>저장하기</button>
        </div>
      </div>
    </div>
  )
}

export default function Screen3_Goals({ onBack }) {
  const { getGoals, getMembers, getProfile, setGoals, addGoal, addMember } = useStore()
  const goals = getGoals()
  const members = getMembers()
  const profile = getProfile()

  // KPI 생성 단계: null | 'csf' | 'kpi'
  const [genStep, setGenStep] = useState(null)
  const [taskInput, setTaskInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [specificity, setSpecificity] = useState(null)
  const [error, setError] = useState('')

  // CSF 단계
  const [csfList, setCsfList] = useState([])
  const [selectedCsf, setSelectedCsf] = useState(null)

  // KPI 단계
  const [kpiSuggestions, setKpiSuggestions] = useState([])

  // 직접 입력
  const [manualForm, setManualForm] = useState(false)
  const [manualKpi, setManualKpi] = useState({ title: '', targetValue: '', unit: '', period: '', measurement: '' })

  // 수정 모달
  const [editingGoal, setEditingGoal] = useState(null)

  const [memberInput, setMemberInput] = useState('')
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // ── Step 1: 업무 입력 → CSF 생성 ──────────────────────────
  const handleGenerateCsf = async (force = false) => {
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
      const result = await generateCsfSuggestions(taskInput, profile.business, profile.department)
      setCsfList(result.csfs)
      setSelectedCsf(null)
      setKpiSuggestions([])
      setGenStep('csf')
    } catch (e) {
      setError('생성 중 오류가 발생했습니다: ' + e.message)
    }
    setLoading(false)
  }

  // ── Step 2: CSF 선택 → KPI 3개 생성 (CSF 화면 유지) ────────
  const handleSelectCsf = async (csf) => {
    setSelectedCsf(csf)
    setKpiSuggestions([])
    setLoading(true)
    setError('')
    try {
      const result = await generateKpiFromCsf(taskInput, csf, profile.business, profile.department)
      setKpiSuggestions(result.kpis)
    } catch (e) {
      setError('KPI 생성 중 오류가 발생했습니다: ' + e.message)
    }
    setLoading(false)
  }

  const handleRetryKpi = async () => {
    if (!selectedCsf) return
    setKpiSuggestions([])
    setLoading(true)
    setError('')
    try {
      const result = await generateKpiFromCsf(taskInput, selectedCsf, profile.business, profile.department)
      setKpiSuggestions(result.kpis)
    } catch (e) {
      setError('KPI 생성 중 오류가 발생했습니다: ' + e.message)
    }
    setLoading(false)
  }

  // ── KPI 보드에 추가 ────────────────────────────────────────
  const handleAddKpi = (kpi) => {
    const newGoal = {
      id: Date.now().toString(),
      task: taskInput,
      kpi: { ...kpi },
      assignees: [],
      currentValue: null,
      scores: { strategicImportance: 3, difficulty: 3, contribution: 3 },
    }
    addGoal(newGoal)
    setGenStep(null)
    setTaskInput('')
    setCsfList([])
    setSelectedCsf(null)
    setKpiSuggestions([])
  }

  const handleAddManual = () => {
    if (!manualKpi.title) return
    const newGoal = {
      id: Date.now().toString(),
      task: taskInput || '직접 입력',
      kpi: { ...manualKpi },
      assignees: [],
      currentValue: null,
      scores: { strategicImportance: 3, difficulty: 3, contribution: 3 },
    }
    addGoal(newGoal)
    setManualForm(false)
    setManualKpi({ title: '', targetValue: '', unit: '', period: '', measurement: '' })
    setTaskInput('')
    setGenStep(null)
  }

  // ── 수정 저장 ──────────────────────────────────────────────
  const handleSaveEdit = (goalId, updatedKpi) => {
    const updated = goals.map(g => g.id === goalId ? { ...g, kpi: updatedKpi } : g)
    setGoals(updated)
    setEditingGoal(null)
  }

  // ── 드래그 ─────────────────────────────────────────────────
  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (active.id !== over?.id) {
      const oldIndex = goals.findIndex(g => g.id === active.id)
      const newIndex = goals.findIndex(g => g.id === over.id)
      setGoals(arrayMove(goals, oldIndex, newIndex))
    }
  }

  const handleAssign = (goalId, name) => {
    setGoals(goals.map(g => g.id === goalId ? { ...g, assignees: [...(g.assignees || []), name] } : g))
  }
  const handleRemoveAssignee = (goalId, name) => {
    setGoals(goals.map(g => g.id === goalId ? { ...g, assignees: (g.assignees || []).filter(a => a !== name) } : g))
  }
  const handleChangeMonth = (goalId, month) => {
    setGoals(goals.map(g => g.id === goalId ? { ...g, deadlineMonth: month } : g))
  }
  const handleAddMember = () => {
    if (memberInput.trim()) { addMember(memberInput.trim()); setMemberInput('') }
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
                    onEdit={setEditingGoal}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Input Card */}
        <div style={styles.inputCard}>
          <div style={styles.inputTitle}>KPI 추가를 위한 업무 입력</div>
          <div style={styles.inputSubtitle}>업무를 구체적으로 설명할수록 더 정확한 KPI를 추천받을 수 있습니다.</div>

          {specificity && !specificity.isSpecific && (
            <div style={styles.hintBox}>
              <div>💡 {specificity.hint}</div>
              {specificity.example && <div style={{ marginTop: '6px', color: '#718096' }}>예: {specificity.example}</div>}
              <button style={styles.forceBtn} onClick={() => handleGenerateCsf(true)}>그냥 생성하기</button>
            </div>
          )}

          {/* Step 0: 업무 입력 */}
          {!genStep && (
            <>
              <div style={styles.guideBox}>
                <div style={styles.guideTitle}>💡 더 좋은 KPI를 받으려면</div>
                <div style={styles.guideItems}>
                  <span>• 어떤 결과물을 만드는 업무인가요?</span>
                  <span>• 측정 가능한 수치가 있나요?</span>
                  <span>• 언제까지 완료해야 하나요?</span>
                </div>
              </div>
              <textarea
                style={styles.textarea}
                placeholder="예: 중소기업 대상 네트워크 보안 취약점 점검 보고서 월 10건 작성"
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                rows={2}
              />
              {error && <div style={styles.errorBox}>{error}</div>}
              <div style={styles.btnRow}>
                <button
                  style={{ ...styles.generateBtn, opacity: loading || !taskInput ? 0.5 : 1 }}
                  onClick={() => handleGenerateCsf(false)}
                  disabled={loading || !taskInput}
                >
                  {loading ? '⏳ 분석 중...' : '✨ KPI 추천 받기'}
                </button>
                <button style={styles.manualBtn} onClick={() => setManualForm(!manualForm)}>
                  ✏️ 직접 입력
                </button>
              </div>
              {manualForm && (
                <div style={styles.manualForm}>
                  <input style={styles.manualInput} placeholder="KPI명" value={manualKpi.title} onChange={e => setManualKpi({ ...manualKpi, title: e.target.value })} />
                  <div style={styles.manualRow}>
                    <input style={{ ...styles.manualInput, flex: 2 }} placeholder="목표값" value={manualKpi.targetValue} onChange={e => setManualKpi({ ...manualKpi, targetValue: e.target.value })} />
                    <input style={{ ...styles.manualInput, flex: 1 }} placeholder="단위" value={manualKpi.unit} onChange={e => setManualKpi({ ...manualKpi, unit: e.target.value })} />
                  </div>
                  <input style={styles.manualInput} placeholder="기간 (예: 2025년 2분기)" value={manualKpi.period} onChange={e => setManualKpi({ ...manualKpi, period: e.target.value })} />
                  <input style={styles.manualInput} placeholder="측정 방법" value={manualKpi.measurement} onChange={e => setManualKpi({ ...manualKpi, measurement: e.target.value })} />
                  <button style={styles.addManualBtn} onClick={handleAddManual}>보드에 추가</button>
                </div>
              )}
            </>
          )}

          {/* Step 1+2: CSF 선택 & KPI 추천 (한 화면) */}
          {genStep === 'csf' && (
            <div style={styles.stepBox}>
              <div style={styles.stepHeader}>
                <div style={styles.stepBadge}>STEP 1</div>
                <div style={styles.stepTitle}>핵심 성공요인(CSF) 선택</div>
                <button style={styles.stepBackBtn} onClick={() => { setGenStep(null); setSelectedCsf(null); setKpiSuggestions([]) }}>← 업무 재입력</button>
              </div>
              <div style={styles.taskChip}>"{taskInput}"</div>
              <div style={styles.stepDesc}>가장 중요한 핵심 성공요인을 선택하세요. 선택 시 아래에 KPI 3개가 바로 제안됩니다.</div>

              <div style={styles.csfGrid}>
                {csfList.map((csf, i) => {
                  const isSelected = selectedCsf?.title === csf.title
                  return (
                    <button
                      key={i}
                      style={{
                        ...styles.csfCard,
                        borderColor: isSelected ? CSF_COLORS[i].color : CSF_COLORS[i].border,
                        borderWidth: isSelected ? '2px' : '2px',
                        background: isSelected ? CSF_COLORS[i].bg : 'white',
                        boxShadow: isSelected ? `0 0 0 3px ${CSF_COLORS[i].color}30` : 'none',
                      }}
                      onClick={() => handleSelectCsf(csf)}
                    >
                      <div style={{ ...styles.csfIcon, background: isSelected ? CSF_COLORS[i].color : CSF_COLORS[i].bg, color: isSelected ? 'white' : CSF_COLORS[i].color }}>
                        {isSelected ? '✓' : CSF_ICONS[i]}
                      </div>
                      <div style={{ ...styles.csfFocus, color: CSF_COLORS[i].color }}>{csf.focus}</div>
                      <div style={styles.csfTitle}>{csf.title}</div>
                      <div style={styles.csfDesc}>{csf.description}</div>
                      {!isSelected && (
                        <div style={{ ...styles.csfSelectBtn, background: CSF_COLORS[i].color }}>
                          이 요인으로 KPI 생성 →
                        </div>
                      )}
                      {isSelected && (
                        <div style={{ ...styles.csfSelectBtn, background: CSF_COLORS[i].color }}>
                          ✓ 선택됨 · 다른 요인 선택 가능
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* KPI 추천 영역 */}
              {selectedCsf && (
                <div style={styles.kpiSection}>
                  <div style={styles.kpiSectionHeader}>
                    <div style={styles.stepBadge2}>STEP 2</div>
                    <div style={styles.kpiSectionTitle}>
                      <strong>{selectedCsf.title}</strong> 기반 KPI 추천
                    </div>
                    {!loading && kpiSuggestions.length > 0 && (
                      <button style={styles.retryKpiBtn} onClick={handleRetryKpi}>↻ 다시 생성</button>
                    )}
                  </div>

                  {loading ? (
                    <div style={styles.loadingBox}>⏳ SMART KPI 설계 중...</div>
                  ) : (
                    <div style={styles.kpiCards}>
                      {kpiSuggestions.map((kpi, i) => (
                        <div key={i} style={styles.kpiPreviewCard}>
                          <div style={styles.kpiPerspective}>{['①', '②', '③'][i]} {kpi.perspective}</div>
                          <div style={styles.kpiPreviewTitle}>{kpi.title}</div>
                          <div style={styles.kpiPreviewDesc}>{kpi.description}</div>
                          <div style={styles.kpiPreviewMeta}>
                            <div style={styles.kpiMetaItem}><span style={styles.kpiMetaLabel}>목표</span>{kpi.targetValue}{kpi.unit}</div>
                            <div style={styles.kpiMetaItem}><span style={styles.kpiMetaLabel}>기간</span>{kpi.period}</div>
                            <div style={styles.kpiMetaItem}><span style={styles.kpiMetaLabel}>측정</span>{kpi.measurement}</div>
                          </div>
                          <button style={styles.addKpiBtn} onClick={() => handleAddKpi(kpi)}>✅ 보드에 추가</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && <div style={styles.errorBox}>{error}</div>}
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
            {members.map(m => <div key={m} style={styles.memberChip}>{m}</div>)}
          </div>
        </div>

        {goals.length > 0 && (
          <button style={styles.confirmBtn} onClick={onBack}>
            ✅ 목표 확정 ({goals.length}개) → 메인으로
          </button>
        )}
      </div>

      {/* 수정 모달 */}
      {editingGoal && (
        <EditModal
          goal={editingGoal}
          onSave={handleSaveEdit}
          onClose={() => setEditingGoal(null)}
        />
      )}
    </div>
  )
}

const rowStyles = {
  row: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f7fafc', gap: '12px', background: 'white', borderRadius: '8px', marginBottom: '6px', cursor: 'default' },
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
  editBtn: { padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#4a5568', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' },
}

const modal = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  box: { background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '18px', fontWeight: 800, color: '#1a202c' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#718096', padding: '4px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  row: { display: 'flex', gap: '10px' },
  footer: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' },
  cancelBtn: { padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px', color: '#718096' },
  saveBtn: { padding: '10px 24px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
}

const styles = {
  bg: { minHeight: '100vh', background: '#f0f4f8', padding: '24px' },
  container: { maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  backBtn: { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#718096' },
  title: { fontSize: '22px', fontWeight: 800, color: '#1a202c', margin: 0 },
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
  textarea: { width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: '12px', boxSizing: 'border-box' },
  errorBox: { background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', padding: '10px', color: '#c53030', fontSize: '13px', marginBottom: '10px' },
  btnRow: { display: 'flex', gap: '10px' },
  generateBtn: { flex: 1, padding: '12px', background: '#4299e1', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
  manualBtn: { padding: '12px 20px', border: '2px solid #e2e8f0', borderRadius: '10px', background: 'white', cursor: 'pointer', fontSize: '14px', color: '#4a5568' },
  manualForm: { marginTop: '16px', padding: '16px', background: '#f7fafc', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' },
  manualInput: { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  manualRow: { display: 'flex', gap: '8px' },
  addManualBtn: { padding: '10px', background: '#2d3748', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 },

  // Step boxes
  stepBox: { marginTop: '16px', borderTop: '2px solid #e2e8f0', paddingTop: '20px' },
  stepHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  stepBadge: { background: '#4299e1', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' },
  stepTitle: { fontSize: '16px', fontWeight: 800, color: '#2d3748', flex: 1 },
  stepBackBtn: { padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#718096' },
  taskChip: { display: 'inline-block', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: '#4a5568', marginBottom: '12px' },
  stepDesc: { fontSize: '13px', color: '#718096', marginBottom: '20px', lineHeight: 1.6 },
  loadingBox: { background: '#f7fafc', borderRadius: '10px', padding: '20px', textAlign: 'center', color: '#718096', fontSize: '14px' },

  // CSF cards
  csfGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  csfCard: { background: 'white', border: '2px solid', borderRadius: '14px', padding: '20px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'transform 0.15s', },
  csfIcon: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  csfFocus: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
  csfTitle: { fontSize: '15px', fontWeight: 800, color: '#1a202c' },
  csfDesc: { fontSize: '12px', color: '#718096', lineHeight: 1.6, flex: 1 },
  csfSelectBtn: { color: 'white', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, textAlign: 'center', marginTop: '4px' },

  // KPI Preview
  kpiSection: { marginTop: '24px', borderTop: '2px dashed #e2e8f0', paddingTop: '20px' },
  kpiSectionHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  stepBadge2: { background: '#48bb78', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', flexShrink: 0 },
  kpiSectionTitle: { flex: 1, fontSize: '15px', color: '#2d3748' },
  kpiCards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  kpiPreviewCard: { border: '2px solid #e2e8f0', borderRadius: '14px', padding: '18px', background: 'white', display: 'flex', flexDirection: 'column', gap: '8px' },
  kpiPerspective: { fontSize: '11px', fontWeight: 700, color: '#4299e1', textTransform: 'uppercase', letterSpacing: '0.5px' },
  kpiPreviewTitle: { fontSize: '15px', fontWeight: 800, color: '#1a202c' },
  kpiPreviewDesc: { fontSize: '12px', color: '#718096', lineHeight: 1.6, flex: 1 },
  kpiPreviewMeta: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: '#f7fafc', borderRadius: '8px' },
  kpiMetaItem: { display: 'flex', gap: '8px', fontSize: '12px', color: '#2d3748' },
  kpiMetaLabel: { fontWeight: 700, color: '#a0aec0', width: '36px', fontSize: '11px', textTransform: 'uppercase', flexShrink: 0 },
  retryKpiBtn: { padding: '7px 14px', background: '#ebf8ff', color: '#2b6cb0', border: '2px solid #bee3f8', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, flexShrink: 0 },
  addKpiBtn: { width: '100%', padding: '10px', background: '#38a169', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, marginTop: '4px' },

  memberCard: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  memberTitle: { fontWeight: 700, color: '#2d3748', marginBottom: '12px' },
  memberInputRow: { display: 'flex', gap: '8px', marginBottom: '12px' },
  memberInput: { flex: 1, padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  addMemberBtn: { padding: '10px 18px', background: '#2d3748', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 },
  memberList: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  memberChip: { background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', color: '#4a5568' },
  confirmBtn: { width: '100%', padding: '18px', background: 'linear-gradient(135deg, #38a169, #276749)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' },
}
