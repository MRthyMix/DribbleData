import { useState, useEffect } from 'react'
import api from '../api'

function StatusBadge({ status }) {
  if (status.includes('Final'))
    return <span className="text-xs font-semibold bg-gray-700 text-gray-300 px-2 py-1 rounded">Final</span>
  if (status.includes('Halftime'))
    return <span className="text-xs font-semibold bg-yellow-600 text-white px-2 py-1 rounded">Halftime</span>
  if (status.includes('Q') || status.includes('OT'))
    return <span className="text-xs font-semibold bg-green-600 text-white px-2 py-1 rounded animate-pulse">LIVE · {status}</span>
  return <span className="text-xs font-semibold bg-blue-700 text-white px-2 py-1 rounded">{status}</span>
}

function TeamRow({ team }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <img src={team.logo}
             alt={team.name} className="h-10 w-10 object-contain"
             onError={e => e.target.style.display = 'none'} />
        <div>
          <p className="font-semibold">{team.name}</p>
          <p className="text-xs text-gray-400">{team.record}</p>
        </div>
      </div>
      <span className={`text-2xl font-bold ${team.pts != null ? 'text-white' : 'text-gray-500'}`}>
        {team.pts ?? '—'}
      </span>
    </div>
  )
}

export default function Scoreboard() {
  const [games, setGames]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/scoreboard')
      .then(res => setGames(res.data.games))
      .catch(() => setGames([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Loading games…</div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12">
      <h1 className="text-3xl font-bold mb-6">Today's Games</h1>
      {games.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-10 text-center text-gray-400">
          No games scheduled today. Check back on a game day.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((game, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-5 flex flex-col space-y-4">
              <div className="flex justify-end"><StatusBadge status={game.status} /></div>
              <TeamRow team={game.visitor} />
              <div className="border-t border-gray-700" />
              <TeamRow team={game.home} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
