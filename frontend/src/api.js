import axios from 'axios'

const TOKEN_KEY = 'dd_token'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export const setToken = token => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* storage unavailable (private mode) — stay logged in for this tab only */ }
}

// Prefix a file in frontend/public with the site's base path
// ('/' locally, '/DribbleData/' on GitHub Pages).
export const asset = path => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  // Locally the Vite proxy forwards /api to Flask; on GitHub Pages this is the Vercel API URL.
  baseURL: API_URL,
  // Cookies only matter same-origin; cross-origin calls authenticate with the bearer token.
  withCredentials: !API_URL,
})

api.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
