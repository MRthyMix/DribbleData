import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  const link = (to, label) => (
    <Link to={to}
          className={`text-sm font-medium transition ${pathname === to ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
      {label}
    </Link>
  )

  return (
    <>
      <div className="text-center pt-4 mb-2">
        <Link to="/">
          <img src="/static/images/logo.png" alt="DribbleData"
               className="mx-auto h-24 hover:opacity-80 transition duration-200" />
        </Link>
      </div>

      <nav className="bg-gray-800 border-b border-gray-700 mb-6">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex space-x-6">
            {link('/scoreboard', 'Scoreboard')}
            {link('/standings', 'Standings')}
            {user && link('/search', 'Search')}
            {user && link('/compare', 'Compare')}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-400 text-sm">{user}</span>
                <button onClick={logout}
                        className="text-sm text-red-400 hover:text-red-300 transition">
                  Logout
                </button>
              </>
            ) : (
              <>
                {link('/login', 'Login')}
                <Link to="/signup"
                      className="text-sm text-white px-3 py-1 rounded transition"
                      style={{ backgroundColor: '#d57240' }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#b85423'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = '#d57240'}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
