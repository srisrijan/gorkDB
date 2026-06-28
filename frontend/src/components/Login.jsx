import { useState } from 'react'
import { api } from '../api/client'

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '', role_name: 'viewer' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        const data = await api.login(form.username, form.password)
        localStorage.setItem('gorkdb_token', data.access_token)
        onLogin({ username: data.username, role: data.role })
      } else {
        await api.register(form.username, form.email, form.password, form.role_name)
        // Auto-login after register
        const data = await api.login(form.username, form.password)
        localStorage.setItem('gorkdb_token', data.access_token)
        onLogin({ username: data.username, role: data.role })
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
              <label>Role</label>
              <select value={form.role_name} onChange={e => update('role_name', e.target.value)}>
                <option value="viewer">Viewer (read-only)</option>
                <option value="analyst">Analyst (read + update)</option>
                <option value="admin">Admin (full access)</option>
              </select>
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
