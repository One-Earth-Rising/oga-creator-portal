import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const adminCheckDone = useRef(false)

  useEffect(() => {
    // Only use onAuthStateChange — skip getSession to avoid lock race
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        setUser(session?.user ?? null)

        if (session?.user && !adminCheckDone.current) {
          adminCheckDone.current = true
          // Small delay lets the auth lock release
          setTimeout(() => checkAdmin(), 100)
        } else if (!session?.user) {
          adminCheckDone.current = false
          setIsAdmin(false)
          setLoading(false)
        }
      }
    )

    // Fallback: if no auth event fires within 2 seconds, stop loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Auth timeout — no session')
        setLoading(false)
      }
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function checkAdmin() {
    try {
      console.log('Calling is_creator_admin RPC...')
      const { data, error } = await supabase.rpc('is_creator_admin')
      console.log('RPC result:', { data, error })
      if (error) {
        console.error('Admin check error:', error)
        setIsAdmin(false)
      } else {
        setIsAdmin(data === true)
      }
    } catch (err) {
      console.error('Admin check failed:', err)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  async function signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }

  async function signInWithPassword(email, password) {
    adminCheckDone.current = false // Reset so checkAdmin runs after login
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    adminCheckDone.current = false
    setUser(null)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signInWithMagicLink, signInWithPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}