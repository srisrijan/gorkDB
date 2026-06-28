import { useState } from 'react'
import { api } from '../api/client'

const ALL_TABLES = [
  { name: 'employees',   label: 'Employees' },
  { name: 'departments', label: 'Departments' },
  { name: 'jobs',        label: 'Jobs' },
  { name: 'locations',   label: 'Locations' },
  { name: 'countries',   label: 'Countries' },
  { name: 'regions',     label: 'Regions' },
  { name: 'dependents',  label: 'Dependents' },
]

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [selectedTables, setSelectedTables] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function toggleTable(name) {
    setSelectedTables(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (tab === 'register' && selectedTables.length === 0) {
      setError('Select at least one table to access')
      return
    }

    setLoading(true)
    try {
      if (tab === 'login') {
        const data = await api.login(form.username, form.password)
        localStorage.setItem('gorkdb_token', data.access_token)
        onLogin({ username: data.username, accessible_tables: data.accessible_tables })
      } else {
        await api.register(form.username, form.email, form.password, selectedTables)
        const data = await api.login(form.username, form.password)
        localStorage.setItem('gorkdb_token', data.access_token)
        onLogin({ username: data.username, accessible_tables: data.accessible_tables })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <h1>GorkDB</h1>
        <p>AI-powered SQL assistant with access control</p>

        <div className="tab-row">
          <button className={`tab-btn${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Sign In</button>
          <button className={`tab-btn${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>Register</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input value={form.username} onChange={e => update('username', e.target.value)} required autoFocus />
          </div>

          {tab === 'register' && (
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} required />
          </div>

          {tab === 'register' && (
            <div className="form-group">
              <label>Table Access <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.8rem' }}>(select tables you need)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {ALL_TABLES.map(t => (
                  <label
                    key={t.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: `1.5px solid ${selectedTables.includes(t.name) ? '#6366f1' : '#334155'}`,
                      background: selectedTables.includes(t.name) ? '#1e1b4b' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(t.name)}
                      onChange={() => toggleTable(t.name)}
                      style={{ accentColor: '#6366f1' }}
                    />
                    {t.label}
                  </label>
                ))}
              </div>
              {selectedTables.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                  You must select at least one table.
                </p>
              )}
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading && <span className="spinner" />}
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: '0.78rem', color: '#64748b' }}>
          Demo users: <strong>viewer_user</strong> / viewer123 &nbsp;|&nbsp;
          <strong>analyst_user</strong> / analyst123 &nbsp;|&nbsp;
          <strong>admin_user</strong> / admin123
        </p>
      </div>
    </div>
  )
}
