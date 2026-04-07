import { useState } from 'react'
import type { FormEvent } from 'react'
import './AuthPage.css'

type AuthPageProps = {
  onAuthSuccess: (userName: string) => void
}

type StoredUser = {
  name: string
  email: string
  password: string
}

const STORAGE_KEYS = {
  users: 'moviesphere-users',
  currentUser: 'moviesphere-current-user',
} as const

const CARD_DATA = [
  '/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg',
  '/q719jXXEzOoYaps6babgKnONONX.jpg',
  '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
  '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
  '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
  '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
  '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
  '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  '/wDwQreuMbCKArZzvJCxVfod4JYZ.jpg',
  '/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg',
  '/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg',
]

function getStoredUsers() {
  const rawUsers = window.localStorage.getItem(STORAGE_KEYS.users)

  if (!rawUsers) {
    return [] as StoredUser[]
  }

  try {
    return JSON.parse(rawUsers) as StoredUser[]
  } catch {
    return []
  }
}

function saveUsers(users: StoredUser[]) {
  window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users))
}

function saveCurrentUser(name: string) {
  window.localStorage.setItem(STORAGE_KEYS.currentUser, name)
}

function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  function resetForm(nextMode: 'login' | 'register') {
    setMode(nextMode)
    setName('')
    setEmail('')
    setPassword('')
    setErrorMessage('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword || (mode === 'register' && !trimmedName)) {
      setErrorMessage('Please fill in all required fields.')
      return
    }

    const users = getStoredUsers()

    if (mode === 'register') {
      const userExists = users.some((user) => user.email === trimmedEmail)

      if (userExists) {
        setErrorMessage('This email is already registered. Try logging in instead.')
        return
      }

      const nextUsers = [
        ...users,
        { name: trimmedName, email: trimmedEmail, password: trimmedPassword },
      ]

      saveUsers(nextUsers)
      saveCurrentUser(trimmedName)
      onAuthSuccess(trimmedName)
      return
    }

    const matchedUser = users.find(
      (user) => user.email === trimmedEmail && user.password === trimmedPassword,
    )

    if (!matchedUser) {
      setErrorMessage('Invalid email or password.')
      return
    }

    saveCurrentUser(matchedUser.name)
    onAuthSuccess(matchedUser.name)
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="auth-copy">
          <p className="auth-eyebrow">MovieSphere access</p>
          <h1>Log in to enter a movie recommendation world built just for you.</h1>
          <p>
            Create an account to save your place at the front door of MovieSphere,
            then explore recommendations, catalogs, and movie details behind a single
            animated entry experience.
          </p>
        </div>

        <div className="scene">
          <div className="a3d" style={{ ['--n' as string]: CARD_DATA.length }}>
            {CARD_DATA.map((item, index) => (
              <img
                alt="MovieSphere visual card"
                className="card"
                key={item}
                src={`https://image.tmdb.org/t/p/w500${item}`}
                style={{ ['--i' as string]: index }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => resetForm('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => resetForm('register')}
            type="button"
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Sign in to continue into MovieSphere.'
              : 'Register once, then step into your personalized movie space.'}
          </p>

          {mode === 'register' ? (
            <label className="auth-field">
              <span>Name</span>
              <input
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                type="text"
                value={name}
              />
            </label>
          ) : null}

          <label className="auth-field">
            <span>Email</span>
            <input
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

          <button className="auth-submit" type="submit">
            {mode === 'login' ? 'Login to MovieSphere' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  )
}

export { STORAGE_KEYS }
export default AuthPage
