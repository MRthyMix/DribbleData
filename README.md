# DribbleData

**Live site:** [https://dribbledata.online](https://dribbledata.online)

DribbleData is a web application for NBA fans to look up player stats, compare players head-to-head, and chat with an AI basketball assistant. It pulls live data directly from the NBA API and presents it with interactive charts.

---

## Features

- **Player Search** — Search any NBA player by name and view their stats from the 5 most recent playoff games, visualized with Chart.js (points, assists, rebounds, steals, blocks, 3-pointers made). Charts are expandable in a modal.
- **Player Comparison** — Compare two players side by side with charts for points, assists, and rebounds.
- **Autocomplete** — Smart player name suggestions as you type, prioritizing prefix matches.
- **AI Chatbot** — Ask basketball questions via a floating chat widget powered by Groq (LLaMA 3.1).
- **User Authentication** — Sign up, log in, and log out. Stats pages are protected behind login. Passwords are hashed with Werkzeug.
- **Home Carousel** — Scrollable photo carousel of featured NBA players (Slick Carousel). Clicking a player card navigates directly to their stats.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, Flask, Flask-SQLAlchemy |
| Database | PostgreSQL (Neon) / SQLite (local fallback) |
| NBA Data | `nba_api` (live, no caching) |
| AI Chatbot | Groq API — LLaMA 3.1 8B |
| Frontend | Jinja2, TailwindCSS, Chart.js, Slick Carousel |
| Auth | Werkzeug password hashing, Flask sessions |
| Testing | pytest |
| CI | GitHub Actions (Python 3.11) |
| Hosting | Raspberry Pi 5 (self-hosted) |
| Server | Gunicorn + Nginx |
| Tunnel | Cloudflare Tunnel (HTTPS, no port forwarding) |

---

## Project Structure

```
DribbleData/
├── app.py                        # All routes, DB model, NBA API calls
├── app_utils.py                  # calculate_age(), get_team_logo_url() helpers
├── requirements.txt
├── pytest.ini
├── view_users.py                 # CLI utility to inspect registered users
├── static/
│   ├── css/home.css
│   ├── images/                   # Player photos, logo, favicon
│   └── js/
│       ├── autocomplete.js       # Shared autocomplete for search + compare inputs
│       ├── chat.js               # Chatbot UI, message history, toggle behavior
│       └── carouselSlide.js      # Slick Carousel init
├── templates/
│   ├── base.html
│   ├── home.html                 # Landing page with carousel
│   ├── search.html               # Player search form
│   ├── index.html                # Player stats + charts
│   ├── compare_players.html      # Compare form
│   ├── compare_player_results.html
│   ├── login.html
│   └── signup.html
├── tests/
│   └── test_search_and_autocomplete.py
└── .github/
    └── workflows/ci.yml
```

---

## Routes

| Route | Auth Required | Description |
|-------|:---:|-----------|
| `/` | No | Home page with player carousel |
| `/signup` | No | Create a new account |
| `/login` | No | Log in |
| `/logout` | No | Log out |
| `/search` | Yes | Player search form |
| `/player?name=<name>` | Yes | Player bio + stats charts |
| `/compare` | Yes | Compare two players form |
| `/compare_results` | Yes | Side-by-side comparison charts |
| `/autocomplete?q=<query>` | Yes | JSON player name suggestions |
| `/chat_page` | Yes | Chatbot page |
| `/chat` | Yes | Chatbot API endpoint (POST) |

---

## Local Setup

### Prerequisites
- Python 3.11+
- pip

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/DribbleData.git
cd DribbleData
```

### 2. Create and activate a virtual environment
```bash
python -m venv .venv
source .venv/Scripts/activate   # Windows
# source .venv/bin/activate     # Mac/Linux
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Create a `.env` file
```
GROQ_API_KEY=your-groq-api-key
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://...   # optional, falls back to SQLite
```

- Get a free Groq API key at [console.groq.com](https://console.groq.com)
- `SECRET_KEY` can be any random string (used for Flask sessions)
- Without `DATABASE_URL`, the app creates a local `users.db` SQLite file

### 5. Run the app
```bash
python app.py
```

Visit `http://localhost:5000` in your browser.

---

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=.

# Run a specific test file
pytest tests/test_search_and_autocomplete.py
```

The test suite covers:
- Search page GET/POST behavior
- Autocomplete filtering and ranking
- SQL injection prevention on login
- XSS protection in player error messages
- HTML injection escaping
- Command injection in search input

---

## CI

GitHub Actions runs `pytest` on every push using Python 3.11. See `.github/workflows/ci.yml`.

---

## Self-Hosting (Raspberry Pi)

The app is self-hosted on a Raspberry Pi 5 and exposed publicly via Cloudflare Tunnel — no port forwarding required.

**Stack:**
- **Gunicorn** — WSGI server (2 workers, port 8000)
- **Nginx** — reverse proxy, serves `/static/` directly
- **Cloudflare Tunnel** — secure HTTPS tunnel from internet to Pi
- **systemd** — keeps all services running and restarts them on boot/crash

**Services (all enabled on boot):**
```bash
sudo systemctl status dribbledata   # Gunicorn
sudo systemctl status nginx
sudo systemctl status cloudflared
```

**Deploying updates:**
```bash
cd ~/DribbleData && git pull
sudo systemctl restart dribbledata
```

**Logs:**
```bash
sudo journalctl -u dribbledata -f
sudo tail -f /var/log/dribbledata/error.log
```
