import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signIn, signUp, session } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) {
    navigate('/admin', { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email, password)

    setSubmitting(false)

    if (error) {
      setError(error)
      return
    }
    if (mode === 'signup') {
      setError('Аккаунт создан. Войдите, используя те же данные.')
      setMode('signin')
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <span className="brand-mark">TxT</span>
          <h1>{mode === 'signin' ? 'Вход' : 'Регистрация'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input"
            />
          </label>

          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="input"
            />
          </label>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Подождите…' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'signin' ? (
            <button type="button" className="link-btn" onClick={() => setMode('signup')}>
              Нет аккаунта? Зарегистрироваться
            </button>
          ) : (
            <button type="button" className="link-btn" onClick={() => setMode('signin')}>
              Уже есть аккаунт? Войти
            </button>
          )}
        </div>

        <div className="auth-back">
          <Link to="/">← На главную</Link>
        </div>
      </div>
    </div>
  )
}
