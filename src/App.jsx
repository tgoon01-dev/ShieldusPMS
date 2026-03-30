import React from 'react'
import { useStore } from './store'
import Screen1_Login from './screens/Screen1_Login'
import Screen2_Menu from './screens/Screen2_Menu'
import Screen3_Goals from './screens/Screen3_Goals'
import Screen4_MidReview from './screens/Screen4_MidReview'
import Screen5_Coaching from './screens/Screen5_Coaching'
import Screen6_Evaluation from './screens/Screen6_Evaluation'

export default function App() {
  const [screen, setScreen] = React.useState('login')
  const currentEmail = useStore(s => s.currentEmail)

  const nav = (to) => setScreen(to)

  if (screen === 'login' || !currentEmail) {
    return <Screen1_Login onNext={() => nav('menu')} />
  }
  if (screen === 'menu') {
    return <Screen2_Menu onSelect={(s) => nav(s)} onLogout={() => { useStore.getState().logout(); nav('login') }} />
  }
  if (screen === 'goals') {
    return <Screen3_Goals onBack={() => nav('menu')} />
  }
  if (screen === 'mid-review') {
    return <Screen4_MidReview onBack={() => nav('menu')} />
  }
  if (screen === 'coaching') {
    return <Screen5_Coaching onBack={() => nav('menu')} />
  }
  if (screen === 'evaluation') {
    return <Screen6_Evaluation onBack={() => nav('menu')} />
  }
  return null
}
