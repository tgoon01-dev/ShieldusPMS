import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const defaultProfile = { email: '', business: '', department: '' }

export const useStore = create(
  persist(
    (set, get) => ({
      // Multi-user data keyed by email
      allData: {},
      currentEmail: null,

      // Current user's data (derived)
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
      getApiKey: () => {
        const { allData, currentEmail } = get()
        return allData[currentEmail]?.apiKey || ''
      },

      initUser: (email, profile, apiKey) => {
        set(state => {
          const existing = state.allData[email] || {}
          return {
            currentEmail: email,
            allData: {
              ...state.allData,
              [email]: {
                goals: [],
                members: [],
                coachingSessions: [],
                selectedGrade: null,
                ...existing,
                profile,
                apiKey: apiKey || existing.apiKey || '',
              }
            }
          }
        })
      },

      updateUser: (fn) => {
        set(state => {
          const email = state.currentEmail
          if (!email) return state
          const current = state.allData[email] || {}
          return {
            allData: {
              ...state.allData,
              [email]: { ...current, ...fn(current) }
            }
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
