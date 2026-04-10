import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(80vh - 8rem)' }}>
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>

        {error && <div className="mb-4 p-3 rounded text-sm text-white bg-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-1">
            <label className="text-sm text-gray-300">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                   placeholder="Your username"
                   className="px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                   required />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm text-gray-300">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                   placeholder="Your password"
                   className="px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                   required />
          </div>
          <button type="submit" disabled={loading}
                  className="mt-2 py-2 rounded font-semibold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-400 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
