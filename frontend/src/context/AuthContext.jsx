import { createContext, useContext, useState, useEffect } from 'react'
import api, { setToken } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still checking

  useEffect(() => {
    api.get('/api/me')
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/api/login', { email, password })
    setToken(res.data.token)
    setUser(res.data.user)
    return res.data
  }

  const logout = async () => {
    setToken(null)
    setUser(null)
    try { await api.post('/api/logout') } catch { /* token already discarded */ }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
