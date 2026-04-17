async function callClaude({ messages, system, max_tokens = 2000, model = 'claude-sonnet-4-6' }) {
  const body = { messages, max_tokens, model }
  if (system) body.system = system
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `서버 오류: ${res.status}`)
  }
  return res.json()
}

export async function generateKpiSuggestions(task, business, department) {
  const response = await callClaude({
    messages: [{
      role: 'user',
      content: `당신은 기업 성과관리 전문가입니다.
아래 업무에 대해 SMART KPI를 3가지 서로 다른 관점으로 제안해주세요.

업무: ${task}
사업부: ${business}
부서: ${department}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "suggestions": [
    {
      "perspective": "정량 중심",
      "title": "KPI명",
      "description": "KPI 상세 설명 (1~2문장)",
      "targetValue": "목표 수치 (예: 10건, 95% 등)",
      "unit": "단위 (건, %, 점 등)",
      "period": "기간 (예: 2025년 2분기)",
      "measurement": "측정 방법 (1문장)"
    },
    {
      "perspective": "품질 중심",
      "title": "KPI명",
      "description": "KPI 상세 설명",
      "targetValue": "목표 수치",
      "unit": "단위",
      "period": "기간",
      "measurement": "측정 방법"
    },
    {
      "perspective": "프로세스 중심",
      "title": "KPI명",
      "description": "KPI 상세 설명",
      "targetValue": "목표 수치",
      "unit": "단위",
      "period": "기간",
      "measurement": "측정 방법"
    }
  ]
}`
    }]
  })
  const text = response.content[0].text.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch[0])
}

export async function generateImprovementAdvice(gapItems, business, department, prevAdvices, feedback) {
  const itemsText = gapItems.map((item, i) =>
    `${i+1}. KPI: "${item.kpi.title}", 목표: ${item.kpi.targetValue}${item.kpi.unit}, 현재: ${item.currentValue}${item.kpi.unit}, 달성률: ${item.achievementRate.toFixed(1)}%`
  ).join('\n')

  const feedbackSection = prevAdvices && feedback && Object.keys(feedback).length > 0
    ? `\n\n이전 조언에 대한 사용자 피드백이 있습니다. 피드백을 반영하여 개선해주세요:\n` +
      prevAdvices.map((adv, i) => {
        const fb1 = feedback[`${i}-0`]
        const fb2 = feedback[`${i}-1`]
        const fbMap = { good: '👍 좋음', neutral: '😐 보통', bad: '👎 아쉬움' }
        return [
          fb1 ? `  - "${adv.advice1}" → 평가: ${fbMap[fb1]}${fb1 === 'bad' ? ' (더 구체적이고 실행 가능한 내용으로 교체 필요)' : fb1 === 'neutral' ? ' (조금 더 개선 필요)' : ' (유지 또는 심화)'}` : null,
          fb2 ? `  - "${adv.advice2}" → 평가: ${fbMap[fb2]}${fb2 === 'bad' ? ' (더 구체적이고 실행 가능한 내용으로 교체 필요)' : fb2 === 'neutral' ? ' (조금 더 개선 필요)' : ' (유지 또는 심화)'}` : null,
        ].filter(Boolean).join('\n')
      }).filter(Boolean).join('\n')
    : ''

  const response = await callClaude({
    messages: [{
      role: 'user',
      content: `당신은 ${business} 사업부 ${department} 팀의 성과관리 전문 코치입니다.
아래 KPI의 달성 현황을 보고, 각 항목별 실행 가능한 개선 방안을 2가지씩 제시해주세요.${feedbackSection}

${itemsText}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "advices": [
    {
      "kpiTitle": "KPI명",
      "gap": "달성 부족 요약 (1문장)",
      "advice1": "개선 방안 1 (구체적이고 실행 가능하게)",
      "advice2": "개선 방안 2 (구체적이고 실행 가능하게)"
    }
  ]
}`
    }]
  })
  const text = response.content[0].text.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch[0])
}

export async function chatWithMember(messages, situation, business, department, assigneeName, kpiInfo) {
  const nameContext = assigneeName ? `이름은 ${assigneeName}입니다. ` : ''
  const kpiContext = kpiInfo
    ? `\n담당 KPI: ${kpiInfo.title} / 목표: ${kpiInfo.targetValue}${kpiInfo.unit} / 현재 달성: ${kpiInfo.currentValue !== null && kpiInfo.currentValue !== undefined ? kpiInfo.currentValue + kpiInfo.unit : '미입력'}`
    : ''
  const systemPrompt = `당신은 ${business} 사업부 ${department} 팀의 팀원입니다. ${nameContext}${kpiContext}

현재 팀원 상황: ${situation}

역할 수행 지침:
- 팀원의 입장에서 자연스럽게 대화하세요
- 상대방(팀장)을 부를 때는 반드시 "팀장님"으로만 호칭하세요
- 상황에 맞는 감정(긴장, 방어적, 솔직함 등)을 표현하세요
- 과도하게 협조적이거나 지나치게 방어적이지 않게, 실제 면담처럼 대화하세요
- 팀장이 좋은 질문을 하면 조금씩 마음을 열고, 일방적이면 방어적으로 반응하세요
- 한 번에 2~4문장 이내로 응답하세요
- 절대로 "저는 AI입니다" 또는 역할극임을 언급하지 마세요`

  const response = await callClaude({
    system: systemPrompt,
    max_tokens: 500,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  })
  return response.content[0].text
}

export async function analyzeFeedback(messages, situation, business, department) {
  const conversationText = messages.map(m =>
    `${m.role === 'user' ? '팀장' : '팀원'}: ${m.content}`
  ).join('\n')

  const response = await callClaude({
    messages: [{
      role: 'user',
      content: `당신은 성과관리 코칭 전문가입니다. 아래 성과 면담 대화를 분석해주세요.

팀원 상황: ${situation}
사업부: ${business} / 부서: ${department}

--- 대화 내용 ---
${conversationText}
--- 끝 ---

팀장의 면담 스킬을 분석하여 아래 JSON 형식으로만 응답하세요:
{
  "overallComment": "전체적인 면담 평가 (2~3문장)",
  "strengths": [
    "잘한 점 1 (구체적인 대화 내용 언급 포함)",
    "잘한 점 2",
    "잘한 점 3"
  ],
  "improvements": [
    "아쉬운 점 1 (개선 방법 포함)",
    "아쉬운 점 2",
    "아쉬운 점 3"
  ],
  "tipForNext": "다음 면담을 위한 핵심 조언 1가지"
}`
    }]
  })
  const text = response.content[0].text.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch[0])
}

export function checkTaskSpecificity(task) {
  if (task.length < 15) {
    return {
      isSpecific: false,
      hint: '업무를 조금 더 구체적으로 입력하면 정확한 KPI를 추천받을 수 있어요.',
      example: task.includes('점검') ? '"중소기업 대상 네트워크 보안 취약점 점검 월 10건 수행"' :
               task.includes('보고') ? '"월간 보안 위협 동향 보고서 작성 및 임원 보고 월 1회"' :
               task.includes('교육') ? '"신규 입사자 보안 교육 프로그램 운영 분기별 2회"' :
               '"구체적인 대상, 수치, 기간을 포함해 입력해보세요"'
    }
  }
  const hasNumber = /\d/.test(task)
  const hasTarget = task.includes('건') || task.includes('%') || task.includes('회') || task.includes('개') || task.includes('명')
  if (!hasNumber && !hasTarget && task.length < 30) {
    return {
      isSpecific: false,
      hint: '측정 가능한 수치(건수, 비율, 횟수 등)나 기간을 추가하면 더 좋은 KPI를 받을 수 있어요.',
      example: null
    }
  }
  return { isSpecific: true }
}
