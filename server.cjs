const express = require('express')
const path = require('path')
const fs = require('fs')
const app = express()
const PORT = 5173

const DB_PATH = path.join(__dirname, 'diagnosis-db.json')

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return {}; }
}
function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

app.use(express.json({ limit: '2mb' }))

// ── 기존 PMS 앱 ──
app.use('/shielduspms', express.static(path.join(__dirname, 'dist')))
app.get('/shielduspms/*path', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// ── 직무역량 진단 도구 ──
app.use('/diagnosis', express.static(path.join(__dirname, 'diagnosis')))
app.get('/diagnosis', (req, res) => res.sendFile(path.join(__dirname, 'diagnosis', 'index.html')))

// ── 진단 결과 저장 API ──
app.post('/api/diagnosis/save', (req, res) => {
  const { email, result } = req.body
  if (!email || !result) return res.status(400).json({ error: 'email and result are required' })
  const db = loadDB()
  if (!db[email]) db[email] = []
  db[email].unshift({ ...result, savedAt: new Date().toISOString() })
  db[email] = db[email].slice(0, 30) // 이메일당 최근 30건 보관
  saveDB(db)
  res.json({ ok: true })
})

// ── 진단 히스토리 조회 API ──
app.get('/api/diagnosis/history/:email', (req, res) => {
  const db = loadDB()
  res.json(db[req.params.email] || [])
})

app.get('/', (req, res) => res.redirect('/shielduspms/'))

app.listen(PORT, () => {
  console.log(`SKShieldus PMS     → http://localhost:${PORT}/shielduspms/`)
  console.log(`직무역량 진단 도구 → http://localhost:${PORT}/diagnosis/`)
})
