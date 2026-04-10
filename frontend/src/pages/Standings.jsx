import { useState, useEffect } from 'react'
import api from '../api'

function ConferenceTable({ title, color, teams }) {
  return (
    <div>
      <h2 className={`text-xl font-bold mb-3 ${color}`}>{title}</h2>
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-700 text-gray-300 uppercase text-xs">
            <tr>
              <th className="px-3 py-3 text-left w-6">#</th>
              <th className="px-3 py-3 text-left">Team</th>
              <th className="px-3 py-3 text-center">W</th>
              <th className="px-3 py-3 text-center">L</th>
              <th className="px-3 py-3 text-center">PCT</th>
              <th className="px-3 py-3 text-center hidden sm:table-cell">Home</th>
              <th className="px-3 py-3 text-center hidden sm:table-cell">Away</th>
              <th className="px-3 py-3 text-center hidden md:table-cell">L10</th>
              <th className="px-3 py-3 text-center hidden md:table-cell">Strk</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => (
              <tr key={team.TeamID} className="border-t border-gray-700 hover:bg-gray-700 transition">
                <td className="px-3 py-3 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center space-x-2">
                    <img src={`https://cdn.nba.com/logos/nba/${team.TeamID}/primary/L/logo.svg`}
                         className="h-6 w-6 object-contain"
                         onError={e => e.target.style.display = 'none'} />
                    <span className="font-medium">{team.TeamCity} {team.TeamName}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-green-400 font-semibold">{team.WINS}</td>
                <td className="px-3 py-3 text-center text-red-400">{team.LOSSES}</td>
                <td className="px-3 py-3 text-center text-gray-300">{Number(team.WinPCT).toFixed(3)}</td>
                <td className="px-3 py-3 text-center text-gray-400 hidden sm:table-cell">{team.HOME}</td>
                <td className="px-3 py-3 text-center text-gray-400 hidden sm:table-cell">{team.ROAD}</td>
                <td className="px-3 py-3 text-center text-gray-400 hidden md:table-cell">{team.L10}</td>
                <td className={`px-3 py-3 text-center hidden md:table-cell font-medium
                  ${team.strCurrentStreak?.startsWith('W') ? 'text-green-400' : 'text-red-400'}`}>
                  {team.strCurrentStreak}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Standings() {
  const [data, setData]       = useState({ east: [], west: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/standings')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Loading standings…</div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 pb-12">
      <h1 className="text-3xl font-bold mb-6">NBA Standings</h1>
      {!data.east.length && !data.west.length ? (
        <div className="bg-gray-800 rounded-lg p-10 text-center text-gray-400">
          Standings unavailable right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ConferenceTable title="Eastern Conference" color="text-blue-400" teams={data.east} />
          <ConferenceTable title="Western Conference" color="text-red-400"  teams={data.west} />
        </div>
      )}
    </div>
  )
}
