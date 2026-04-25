import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, authReady, db, firebaseEnabled } from './firebase'
import './AuthPage.css'

type AuthPageProps = {
  onAuthSuccess: (userName: string) => void
}

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

function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [hiddenCards, setHiddenCards] = useState<string[]>([])

  const visibleCards = CARD_DATA.filter((item) => !hiddenCards.includes(item))

  function resetForm(nextMode: 'login' | 'register') {
    setMode(nextMode)
    setName('')
    setEmail('')
    setPassword('')
    setErrorMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!firebaseEnabled || !auth || !db) {
      setErrorMessage('Firebase is not configured yet. Add the Firebase env variables first.')
      return
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword || (mode === 'register' && !trimmedName)) {
      setErrorMessage('Please fill in all required fields.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    try {
      await authReady

      if (mode === 'register') {
        const credentials = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          trimmedPassword,
        )

        await updateProfile(credentials.user, { displayName: trimmedName })
        await setDoc(doc(db, 'users', credentials.user.uid), {
          uid: credentials.user.uid,
          displayName: trimmedName,
          email: trimmedEmail,
          bio: '',
          createdAt: serverTimestamp(),
        })

        onAuthSuccess(trimmedName)
        return
      }

      const credentials = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
      const userRef = doc(db, 'users', credentials.user.uid)
      const existingUser = await getDoc(userRef)

      await setDoc(
        userRef,
        {
          uid: credentials.user.uid,
          displayName: credentials.user.displayName || 'MovieSphere User',
          email: credentials.user.email || trimmedEmail,
          ...(existingUser.exists()
            ? {}
            : {
                bio: '',
                createdAt: serverTimestamp(),
              }),
          lastLoginAt: serverTimestamp(),
        },
        { merge: true },
      )
      onAuthSuccess(credentials.user.displayName || 'MovieSphere User')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to complete authentication.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="auth-copy">
          <p className="auth-eyebrow">MovieSphere access</p>
          <h1>Log in to enter a movie recommendation world built just for you.</h1>
          <p>
            Create an account to unlock your personal profile, watchlist, and movie
            recommendations inside MovieSphere.
          </p>
          {!firebaseEnabled ? (
            <p className="auth-config-note">
              Firebase setup is still required. Add your Firebase env values to use
              real authentication, profiles, and watchlists.
            </p>
          ) : null}
        </div>

        <div className="scene">
          <div className="a3d" style={{ ['--n' as string]: Math.max(visibleCards.length, 1) }}>
            {visibleCards.map((item, index) => (
              <img
                alt="MovieSphere visual card"
                className="card"
                key={item}
                onError={() => {
                  setHiddenCards((current) =>
                    current.includes(item) ? current : [...current, item],
                  )
                }}
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
              : 'Register once, then keep your watchlist and profile with you.'}
          </p>

          {mode === 'register' ? (
            <label className="auth-field">
              <span>Display name</span>
              <input
                onChange={(event) => setName(event.target.value)}
                placeholder="Choose your display name"
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

          <button className="auth-submit" disabled={submitting || !firebaseEnabled} type="submit">
            {submitting
              ? 'Please wait...'
              : mode === 'login'
                ? 'Login to MovieSphere'
                : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default AuthPage
