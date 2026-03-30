import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 이메일로 사용자 데이터 불러오기
export async function loadUserData(email) {
  const { data, error } = await supabase
    .from('shielduspms')
    .select('*')
    .eq('email', email)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = row not found (신규 사용자)
    console.error('Supabase load error:', error)
    return null
  }
  return data || null
}

// 사용자 데이터 저장/업데이트 (upsert)
export async function saveUserData(email, userData) {
  const { error } = await supabase
    .from('shielduspms')
    .upsert({
      email,
      profile: userData.profile || {},
      goals: userData.goals || [],
      members: userData.members || [],
      coaching_sessions: userData.coachingSessions || [],
      assignee_grades: userData.assigneeGrades || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })

  if (error) {
    console.error('Supabase save error:', error)
  }
}
