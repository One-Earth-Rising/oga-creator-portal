import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { user, loading, signInWithMagicLink, signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [usePassword, setUsePassword] = useState(true)

  if (loading) {
    return (
      <div className="min-h-screen bg-oga-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-oga-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (usePassword) {
        await signInWithPassword(email, password)
      } else {
        await signInWithMagicLink(email)
        setSent(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-oga-black flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <img
            src="https://jmbzrbteizvuqwukojzu.supabase.co/storage/v1/object/public/oga-files/oga_logo.png"
            alt="OGA"
            className="w-16 h-16 object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">Creator Portal</h1>
            <p className="text-white/40 text-sm uppercase tracking-wider">One Earth Rising</p>
          </div>
        </div>

        <div className="oga-card p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-oga-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-oga-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold uppercase mb-3">Check Your Email</h2>
              <p className="text-white/60 mb-6">
                We sent a login link to <span className="text-oga-green">{email}</span>
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="oga-btn-secondary text-sm"
              >
                Use Different Email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold uppercase mb-2">Sign In</h2>
              <p className="text-white/40 text-sm mb-8">Admin access only. Enter your OER email to continue.</p>

              <form onSubmit={handleSubmit}>
                <label className="oga-label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@oneearthrising.com"
                  className="oga-input mb-4"
                  required
                  autoFocus
                />

                {usePassword && (
                  <>
                    <label className="oga-label">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="oga-input mb-6"
                      required
                    />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setUsePassword(!usePassword)}
                  className="text-xs text-white/30 hover:text-oga-green mb-4 transition-colors"
                >
                  {usePassword ? 'Use magic link instead' : 'Use password instead'}
                </button>

                {error && (
                  <div className="text-red-400 text-sm mb-4 p-3 bg-red-400/10 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !email}
                  className="oga-btn-primary w-full"
                >
                  {submitting ? 'Signing in...' : (usePassword ? 'Sign In' : 'Send Magic Link')}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-8 uppercase tracking-wider">
          OGA™ — Patented Technology
        </p>
      </div>
    </div>
  )
}
