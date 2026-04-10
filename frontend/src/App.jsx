import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import PrivateRoute from './components/PrivateRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Scoreboard from './pages/Scoreboard'
import Standings from './pages/Standings'
import Search from './pages/Search'
import Player from './pages/Player'
import Compare from './pages/Compare'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-900 text-white">
          <Navbar />
          <Routes>
            <Route path="/"           element={<Home />} />
            <Route path="/login"      element={<Login />} />
            <Route path="/signup"     element={<Signup />} />
            <Route path="/scoreboard" element={<Scoreboard />} />
            <Route path="/standings"  element={<Standings />} />
            <Route path="/search"     element={<PrivateRoute><Search /></PrivateRoute>} />
            <Route path="/player"     element={<PrivateRoute><Player /></PrivateRoute>} />
            <Route path="/compare"    element={<PrivateRoute><Compare /></PrivateRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
