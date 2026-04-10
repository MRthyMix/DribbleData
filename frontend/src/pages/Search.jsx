import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function Search() {
  const [query, setSuggestions_q] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const navigate     = useNavigate()
  const debounceRef  = useRef(null)

  const handleChange = e => {
    const val = e.target.value
    setSuggestions_q(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/autocomplete?q=${encodeURIComponent(val)}`)
        setSuggestions(res.data)
      } catch { setSuggestions([]) }
    }, 250)
  }

  const go = name => navigate(`/player?name=${encodeURIComponent(name)}`)

  const handleSubmit = e => {
    e.preventDefault()
    if (query.trim()) go(query.trim())
  }

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-8">Search for an NBA Player</h1>
      <div className="relative w-full max-w-md">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input type="text" value={query} onChange={handleChange}
                 placeholder="e.g. LeBron James"
                 className="flex-grow px-4 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                 autoComplete="off" />
          <button type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition">
            Search
          </button>
        </form>
        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 bg-gray-700 rounded-b shadow-lg z-10 mt-1">
            {suggestions.map(p => (
              <li key={p.id} onClick={() => go(p.full_name)}
                  className="px-4 py-2 hover:bg-gray-600 cursor-pointer transition">
                {p.full_name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
