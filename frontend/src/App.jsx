import { useEffect, useState } from 'react'
import Login from './components/Login'
import QueryHistory from './components/QueryHistory'
import QueryInput from './components/QueryInput'

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('query')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('gorkdb_token')
    if (!token) { setChecking(false); return }
    fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setUser({ username: data.username, role: data.role })
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [])

  function handleLogin(userData) {
    setUser(userData)
    setPage('query')
  }

  function handleLogout() {
    localStorage.removeItem('gorkdb_token')
    setUser(null)
  }

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    )
  }

  if (!user) return <Login onLogin={handleLogin} />

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>GorkDB</h1>
        <p className="role-badge">{user.role}</p>
        <span style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 8 }}>
          {user.username}
        </span>
        <button
          className={`nav-btn${page === 'query' ? ' active' : ''}`}
          onClick={() => setPage('query')}
        >
          🔍 Query
        </button>
        <button
          className={`nav-btn${page === 'history' ? ' active' : ''}`}
          onClick={() => setPage('history')}
        >
          📜 History
        </button>
        <button className="logout-btn" onClick={handleLogout}>Sign out</button>
      </aside>
      <main className="main">
        {page === 'query'   && <QueryInput />}
        {page === 'history' && <QueryHistory />}
      </main>
    </div>
  )
}
