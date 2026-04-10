import { useState, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from 'chart.js'
import api from '../api'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function PlayerInput({ label, value, onChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([])
  const debounceRef = useRef(null)

  const handleChange = e => {
    onChange(e.target.value)
    clearTimeout(debounceRef.current)
    if (!e.target.value.trim()) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/autocomplete?q=${encodeURIComponent(e.target.value)}`)
        setSuggestions(res.data)
      } catch { setSuggestions([]) }
    }, 250)
  }

  return (
    <div className="relative">
      <label className="text-sm text-gray-300 block mb-1">{label}</label>
      <input type="text" value={value} onChange={handleChange}
             placeholder="e.g. LeBron James"
             className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
             autoComplete="off" />
      {suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 bg-gray-700 rounded-b shadow-lg z-10">
          {suggestions.map(p => (
            <li key={p.id}
                onClick={() => { onSelect(p.full_name); setSuggestions([]) }}
                className="px-4 py-2 hover:bg-gray-600 cursor-pointer transition">
              {p.full_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const STATS  = ['PTS', 'AST', 'REB']
const COLORS = ['rgba(75,192,192,0.6)', 'rgba(255,206,86,0.6)', 'rgba(255,99,132,0.6)']

export default function Compare() {
  const [p1, setP1]           = useState('')
  const [p2, setP2]           = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleCompare = async e => {
    e.preventDefault()
    if (!p1.trim() || !p2.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.get(`/api/compare?player1=${encodeURIComponent(p1)}&player2=${encodeURIComponent(p2)}`)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load comparison.')
    } finally {
      setLoading(false)
    }
  }

  const makeChart = (games, stat, color) => ({
    labels: games.map(g => g.GAME_DATE),
    datasets: [{ label: stat, data: games.map(g => g[stat]), backgroundColor: color }],
  })

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Compare Players</h1>

      <form onSubmit={handleCompare} className="bg-gray-800 p-6 rounded-lg mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <PlayerInput label="Player 1" value={p1} onChange={setP1} onSelect={setP1} />
          <PlayerInput label="Player 2" value={p2} onChange={setP2} onSelect={setP2} />
        </div>
        <button type="submit" disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition disabled:opacity-50">
          {loading ? 'Loading…' : 'Compare'}
        </button>
      </form>

      {error && <div className="text-red-400 text-center mb-4">{error}</div>}

      {result && STATS.map((stat, i) => (
        <div key={stat} className="bg-gray-800 p-6 rounded-lg mb-6">
          <h3 className="text-xl font-bold mb-4 text-center">{stat} — Last 5 Games</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[result.player1, result.player2].map(player => (
              <div key={player.name}>
                <p className="text-center text-gray-300 font-semibold mb-2">{player.name}</p>
                <Bar data={makeChart(player.games, stat, COLORS[i])}
                     options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
