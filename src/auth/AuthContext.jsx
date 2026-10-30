import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getApiError } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/auth/me')
      .then(({ data }) => { if (active) setUser(data.user) })
      .catch(error => {
        if (!active) return
        setUser(null)
        if (error.response?.status !== 401) setSessionError(getApiError(error))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const signIn = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials)
    setUser(data.user)
    setSessionError('')
    return data.user
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  return <AuthContext.Provider value={{ user, loading, sessionError, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
