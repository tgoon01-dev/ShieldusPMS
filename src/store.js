import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveUserData } from './lib/supabase'

const defaultProfile = { email: '', business: '', department: '' }

// Supabase에 debounce 저장 (연속 변경 시 과도한 API 호출 방지)
let saveTimer = null
function debouncedSave(email, userData) {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveUserData(email, userData)
  }, 800)
}

export const useStore = create(
  persist(
    (set, get) => ({
      allData: {},
      currentEmail: null,

      getProfile: () => {
        const { allData, currentEmail } = get()
        return allData[currentEmail]?.profile || defaultProfile
      },
      getGoals: () => {
        const { allData, currentEmail } = get()
        return allData[currentEmail]?.goals || []
      },
      getMembers: () => {
        const { allData, currentEmail } = get()
        return allData[currentEmail]?.members || []
      },
      getCoachingSessions: () => {
        const { allData, currentEmail } = get()
        return allData[currentEmail]?.coachingSessions || []
      },
      getAssigneeGrades: () => {
        const { allData, currentEmail } = get()
        return allData[currentEmail]?.assigneeGrades || {}
      },

      initUser: (email, profile, remoteData) => {
        set(state => {
          const existing = state.allData[email] || {}
          const merged = remoteData
            ? {
                // Supabase 데이터를 우선 사용
                goals: remoteData.goals || [],
                members: remoteData.members || [],
                coachingSessions: remoteData.coaching_sessions || [],
                assigneeGrades: remoteData.assignee_grades || {},
                ...existing,
                profile,
              }
            : {
                goals: [],
                members: [],
                coachingSessions: [],
                assigneeGrades: {},
                ...existing,
                profile,
              }
          return {
            currentEmail: email,
            allData: { ...state.allData, [email]: merged },
          }
        })
      },

      updateUser: (fn) => {
        set(state => {
          const email = state.currentEmail
          if (!email) return state
          const current = state.allData[email] || {}
          const next = { ...current, ...fn(current) }
          debouncedSave(email, next)
          return {
            allData: { ...state.allData, [email]: next }
          }
        })
      },

      setGoals: (goals) => {
        get().updateUser(() => ({ goals }))
      },
      addGoal: (goal) => {
        get().updateUser(u => ({ goals: [...(u.goals || []), goal] }))
      },
      updateGoal: (id, updates) => {
        get().updateUser(u => ({
          goals: (u.goals || []).map(g => g.id === id ? { ...g, ...updates } : g)
        }))
      },
      setMembers: (members) => {
        get().updateUser(() => ({ members }))
      },
      addMember: (name) => {
        get().updateUser(u => {
          const members = u.members || []
          if (members.includes(name)) return {}
          return { members: [...members, name] }
        })
      },
      addCoachingSession: (session) => {
        get().updateUser(u => ({
          coachingSessions: [...(u.coachingSessions || []), session]
        }))
      },
      updateCoachingSession: (id, updates) => {
        get().updateUser(u => ({
          coachingSessions: (u.coachingSessions || []).map(s =>
            s.id === id ? { ...s, ...updates } : s
          )
        }))
      },
      setAssigneeGrade: (name, grade) => {
        get().updateUser(u => ({
          assigneeGrades: { ...(u.assigneeGrades || {}), [name]: grade }
        }))
      },

      logout: () => set({ currentEmail: null }),
    }),
    {
      name: 'skshieldus-performance',
      partialize: (state) => ({ allData: state.allData }),
    }
  )
)
