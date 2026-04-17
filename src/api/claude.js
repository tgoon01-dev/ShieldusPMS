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

export async function generateCsfSuggestions(task, business, department) {
  const response = await callClaude({
    messages: [{
      role: 'user',
      content: `당신은 기업 성과관리 전문가입니다.
아래 업무의 성공을 위한 핵심 성공요인(CSF) 3가지를 서로 다른 관점에서 제안해주세요.

업무: ${task}
사업부: ${business}
부서: ${department}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "csfs": [
    {
      "title": "CSF 제목 (10자 이내)",
      "description": "이 요인이 핵심인 이유 (2문장 이내)",
      "focus": "관점 키워드 (예: 실행 속도, 품질 완성도, 이해관계자 관리)"
    }
  ]
}`
    }],
    max_tokens: 1000,
  })
  const text = response.content[0].text.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch[0])
}

export async function generateKpiFromCsf(task, csf, business, department) {
  const response = await callClaude({
    messages: [{
      role: 'user',
      content: `당신은 기업 성과관리 전문가입니다.
아래 업무와 핵심 성공요인을 기반으로 서로 다른 관점의 SMART KPI 3개를 제안해주세요.

업무: ${task}
핵심 성공요인: ${csf.title} (${csf.focus})
CSF 설명: ${csf.description}
사업부: ${business}
부서: ${department}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "kpis": [
    {
      "perspective": "관점 (예: 정량, 품질, 프로세스)",
      "title": "KPI명 (구체적이고 측정 가능하게)",
      "description": "KPI 상세 설명 (1~2문장)",
      "targetValue": "목표 수치",
      "unit": "단위 (건, %, 점, 회 등)",
      "period": "기간 (예: 2025년 연간)",
      "measurement": "측정 방법 (1문장)"
    },
    { "perspective": "관점2", "title": "...", "description": "...", "targetValue": "...", "unit": "...", "period": "...", "measurement": "..." },
    { "perspective": "관점3", "title": "...", "description": "...", "targetValue": "...", "unit": "...", "period": "...", "measurement": "..." }
  ]
}`
    }],
    max_tokens: 1500,
  })
  const text = response.content[0].text.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch[0])
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

const TRAIT_BEHAVIORS = {
  '주도적인': '자신의 의견을 먼저 제시하고 대화를 주도하려는 경향. 수동적으로 기다리지 않고 먼저 말을 꺼냄',
  '수용적인': '팀장의 의견을 잘 받아들이고 긍정적으로 반응. 반박보다는 공감과 동의를 먼저 표현',
  '헌신적인': '팀과 목표에 강한 책임감을 보임. 어려움도 감수하겠다는 태도를 드러냄',
  '치밀한': '데이터와 구체적 근거를 중시. "수치로 보면...", "정확히 말하면..." 식으로 세부사항을 따짐',
  '유연한': '상황 변화에 잘 적응하고 타협점을 찾으려 함. 다양한 가능성을 열어두는 말투를 씀',
  '일관된': '처음 입장을 끝까지 유지. 쉽게 흔들리지 않으며 원칙을 강조함',
  '논리적인': '감정보다 이유와 근거로 대화. 인과관계를 설명하며 체계적으로 말함',
  '낙천적인': '어려운 상황에서도 긍정적인 면을 찾음. "그래도...", "잘 될 것 같아요" 식의 말투',
  '겸손한': '자신의 부족함을 먼저 인정하고 배우려는 자세. 과도하게 자신을 낮추기도 함',
  '대담한': '리스크를 감수하더라도 솔직하게 의견을 말함. 불편한 진실도 직접적으로 꺼냄',
  '수동적인': '스스로 말하기보다 질문받을 때 짧게 답함. 침묵이 길고 자발적 발언이 적음',
  '방어적인': '비판이나 피드백에 즉시 변명하고 정당화하려 함. "그건 제 잘못이 아니라..." 식의 반응',
  '냉소적인': '팀장의 말이나 회사 방침에 회의적. "어차피...", "그게 무슨 의미가 있나요" 식의 말투',
  '산만한': '집중력이 부족하고 주제에서 벗어난 말을 꺼냄. 대화 흐름을 자주 끊음',
  '독단적인': '자기 생각이 옳다고 확신하며 쉽게 의견을 바꾸지 않음. 강한 어조로 자기 주장을 반복',
  '충동적인': '감정적으로 즉각 반응하며 생각 없이 말을 내뱉기도 함. 나중에 수습하려는 모습도 보임',
  '기회주의적인': '자신에게 유리한 방향으로만 대화를 끌려 함. 이득이 되는 부분만 적극 반응',
  '위축된': '자신감이 없어 목소리가 작고 의견 표현을 꺼림. "잘 모르겠어요...", "제가 뭐라 말하기가..." 식',
  '고지식한': '기존 방식과 규칙을 고수하며 변화를 거부. "원래 이렇게 해왔는데요..." 식의 저항',
  '예민한': '작은 피드백에도 감정적으로 반응. 표정이나 말투에서 불편함이 즉시 드러남',
}

export async function chatWithMember(messages, situation, business, department, assigneeName, kpiInfo, traits = []) {
  const nameContext = assigneeName ? `이름은 ${assigneeName}입니다. ` : ''
  const kpiContext = kpiInfo
    ? `\n담당 KPI: ${kpiInfo.title} / 목표: ${kpiInfo.targetValue}${kpiInfo.unit} / 현재 달성: ${kpiInfo.currentValue !== null && kpiInfo.currentValue !== undefined ? kpiInfo.currentValue + kpiInfo.unit : '미입력'}`
    : ''
  const traitContext = traits.length > 0
    ? `\n\n이 팀원의 성향: ${traits.join(', ')}\n성향별 행동 방식:\n${traits.map(t => `- ${t}: ${TRAIT_BEHAVIORS[t] || ''}`).join('\n')}\n위 성향들이 복합적으로 나타나도록 자연스럽게 연기하세요.`
    : ''
  const systemPrompt = `당신은 ${business} 사업부 ${department} 팀의 팀원입니다. ${nameContext}${kpiContext}${traitContext}

현재 팀원 상황: ${situation}

역할 수행 지침:
- 팀원의 입장에서 자연스럽게 대화하세요
- 상대방(팀장)을 부를 때는 반드시 "팀장님"으로만 호칭하세요
- 위에 명시된 성향이 대화 전반에 일관되게 드러나도록 하세요
- 과도하게 협조적이거나 지나치게 방어적이지 않게, 실제 면담처럼 대화하세요
- 팀장이 성향에 맞는 접근을 하면 조금씩 반응하고, 그렇지 않으면 성향대로 반응하세요
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
