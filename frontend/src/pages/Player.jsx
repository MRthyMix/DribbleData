import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from 'chart.js'
import api from '../api'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const chartOpts = { responsive: true, scales: { y: { beginAtZero: true } } }

const CHARTS = [
  { label: 'Points',   key: 'PTS', color: 'rgba(75,192,192,0.6)' },
  { label: 'Rebounds', key: 'REB', color: 'rgba(255,99,132,0.6)' },
  { label: 'Assists',  key: 'AST', color: 'rgba(255,206,86,0.6)' },
  { label: 'Steals',   key: 'STL', color: 'rgba(153,102,255,0.6)' },
  { label: 'Blocks',   key: 'BLK', color: 'rgba(255,159,64,0.6)' },
]

export default function Player() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const name = searchParams.get('name')

  useEffect(() => {
    if (!name) return
    setLoading(true)
    api.get(`/api/player?name=${encodeURIComponent(name)}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load player.'))
      .finally(() => setLoading(false))
  }, [name])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading player…</div>
  if (error)   return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>
  if (!data)   return null

  const { player, season_avg, recent_games } = data
  const labels = recent_games.map(g => g.GAME_DATE)

  const makeChart = ({ label, key, color }) => ({
    labels,
    datasets: [{ label, data: recent_games.map(g => g[key]), backgroundColor: color }],
  })

  return (
    <div className="flex flex-col items-center p-6">
      {/* Header */}
      <img src={player.headshot} alt={player.name}
           className="w-40 h-40 object-cover rounded-full shadow-lg"
           onError={e => { e.target.src = '/static/images/fallback.png' }} />
      <h1 className="text-4xl font-bold mt-4">{player.name}</h1>
      <p className="mt-2 text-gray-300 text-sm">
        Age: {player.age ?? 'N/A'} · Height: {player.height} · Weight: {player.weight} · Exp: {player.exp} yrs
      </p>

      {/* Season averages */}
      {season_avg && (
        <div className="mt-6 w-full max-w-3xl bg-gray-800 rounded-lg px-6 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
            {season_avg.season} Season Averages
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
            {[
              ['PTS', season_avg.pts], ['REB', season_avg.reb], ['AST', season_avg.ast],
              ['STL', season_avg.stl], ['BLK', season_avg.blk], ['3PM', season_avg.fg3m],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-2xl font-bold">{val}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <p className="text-xs text-gray-400 uppercase tracking-widest mt-8 mb-4">
        Last 5 Regular Season Games
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        {CHARTS.slice(0, 3).map(c => (
          <div key={c.key} className="bg-gray-800 p-4 rounded shadow">
            <h3 className="text-lg font-bold mb-2 text-center">{c.label} Per Game</h3>
            <Bar data={makeChart(c)} options={chartOpts} />
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-6 w-full max-w-4xl">
        {CHARTS.slice(3).map(c => (
          <div key={c.key} className="bg-gray-800 p-4 rounded shadow w-full sm:w-80">
            <h3 className="text-lg font-bold mb-2 text-center">{c.label} Per Game</h3>
            <Bar data={makeChart(c)} options={chartOpts} />
          </div>
        ))}
      </div>

      <button onClick={() => navigate('/search')}
              className="mt-8 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition">
        ← Back to Search
      </button>
    </div>
  )
}
