import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Slider from 'react-slick'

const PLAYERS = [
  { name: 'LeBron James',          image: '/static/images/lebron.jpg' },
  { name: 'Stephen Curry',         image: '/static/images/curry.jpg' },
  { name: 'Kevin Durant',          image: '/static/images/durant.jpg' },
  { name: 'Anthony Edwards',       image: '/static/images/edwards.jpg' },
  { name: 'Giannis Antetokounmpo', image: '/static/images/giannis.jpg' },
  { name: 'Victor Wembanyama',     image: '/static/images/wemby.jpg' },
  { name: 'James Harden',          image: '/static/images/harden.jpg' },
  { name: 'Ja Morant',             image: '/static/images/jamorant.jpg' },
  { name: 'Kyrie Irving',          image: '/static/images/kyrie.jpg' },
  { name: 'Devin Booker',          image: '/static/images/booker.jpg' },
  { name: 'Klay Thompson',         image: '/static/images/klay.jpg' },
  { name: 'Paul George',           image: '/static/images/paul.jpg' },
]

const SLIDER_SETTINGS = {
  slidesToShow: 5,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 2000,
  speed: 600,
  cssEase: 'ease-in-out',
  arrows: true,
  infinite: true,
  pauseOnHover: false,
  pauseOnFocus: false,
  swipe: true,
  draggable: true,
  swipeToSlide: true,
  touchThreshold: 10,
  responsive: [
    { breakpoint: 1024, settings: { slidesToShow: 4 } },
    { breakpoint: 768,  settings: { slidesToShow: 3 } },
    { breakpoint: 480,  settings: { slidesToShow: 2 } },
  ],
}

export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mouseDownX, setMouseDownX] = useState(0)
  const [dragged, setDragged]       = useState(false)

  const onMouseDown = e => { setMouseDownX(e.clientX); setDragged(false) }
  const onMouseUp   = e => {
    if (Math.abs(e.clientX - mouseDownX) > 5) {
      setDragged(true)
      setTimeout(() => setDragged(false), 100)
    }
  }

  const handlePlayerClick = name => {
    if (dragged) return
    user ? navigate(`/player?name=${encodeURIComponent(name)}`) : navigate('/login')
  }

  const btn = (label, onClick, bg, hoverBg) => (
    <button onClick={onClick}
            className="px-8 py-3 text-white text-xl rounded shadow-lg transition"
            style={{ backgroundColor: bg }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = hoverBg}
            onMouseOut={e => e.currentTarget.style.backgroundColor = bg}>
      {label}
    </button>
  )

  return (
    <div className="flex flex-col items-center justify-start p-6 pt-2">
      <div className="relative w-full max-w-6xl mb-8"
           onMouseDown={onMouseDown} onMouseUp={onMouseUp}>
        <Slider {...SLIDER_SETTINGS}>
          {PLAYERS.map(p => (
            <div key={p.name} className="p-2">
              <div className="relative group cursor-pointer"
                   onClick={() => handlePlayerClick(p.name)}>
                <img src={p.image} alt={p.name}
                     className="h-80 w-full object-cover rounded shadow-lg group-hover:opacity-80 transition" />
                <div className="absolute inset-0 flex items-center justify-center
                                opacity-0 group-hover:opacity-100 transition
                                bg-black bg-opacity-50 rounded">
                  <span className="text-white text-xl font-bold text-center px-2">{p.name}</span>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {user ? (
          <>
            {btn('SEARCH',          () => navigate('/search'),  '#d57240', '#b85423')}
            {btn('COMPARE PLAYERS', () => navigate('/compare'), '#d57240', '#b85423')}
            {btn('LOGOUT',          logout,                     '#ce1d1d', '#b91c1c')}
          </>
        ) : (
          <>
            {btn('SIGN UP', () => navigate('/signup'), '#17a34a', '#15803d')}
            {btn('LOGIN',   () => navigate('/login'),  '#2563ea', '#1d4ed8')}
          </>
        )}
      </div>
    </div>
  )
}
