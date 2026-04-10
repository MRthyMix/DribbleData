import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still checking

  useEffect(() => {
    api.get('/api/me')
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
  }, [])

  const login = async (username, password) => {
    const res = await api.post('/api/login', { username, password })
    setUser(res.data.user)
    return res.data
  }

  const logout = async () => {
    await api.post('/api/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
