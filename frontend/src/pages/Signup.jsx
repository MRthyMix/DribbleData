import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

export default function Signup() {
  const [form, setForm]       = useState({ username: '', email: '', password: '' })
  const [error, setError]     = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await api.post('/api/signup', form)
      setMessage(res.data.message)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(80vh - 8rem)' }}>
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-center">Create Account</h1>
        <p className="text-gray-400 text-center mb-6 text-sm">Join to get NBA bets, news & analysis</p>

        {error   && <div className="mb-4 p-3 rounded text-sm text-white bg-red-600">{error}</div>}
        {message && <div className="mb-4 p-3 rounded text-sm text-white bg-green-600">{message}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          {[
            { name: 'username', label: 'Username',  type: 'text',     placeholder: 'e.g. hoopsfan23' },
            { name: 'email',    label: 'Email',     type: 'email',    placeholder: 'you@example.com' },
            { name: 'password', label: 'Password',  type: 'password', placeholder: 'At least 6 characters', min: 6 },
          ].map(f => (
            <div key={f.name} className="flex flex-col space-y-1">
              <label className="text-sm text-gray-300">{f.label}</label>
              <input type={f.type} name={f.name} value={form[f.name]}
                     onChange={handleChange} placeholder={f.placeholder}
                     minLength={f.min}
                     className="px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                     required />
            </div>
          ))}
          <button type="submit" disabled={loading}
                  className="mt-2 py-2 rounded font-semibold text-white transition disabled:opacity-50"
                  style={{ backgroundColor: '#d57240' }}
                  onMouseOver={e => { if (!loading) e.currentTarget.style.backgroundColor = '#b85423' }}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = '#d57240'}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
