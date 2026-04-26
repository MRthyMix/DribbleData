from flask import Flask, request, session, jsonify, send_from_directory
from nba_api.stats.static import players
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from functools import wraps
from dotenv import load_dotenv
import os
import traceback
import logging
import requests
from groq import Groq

logging.basicConfig(level=logging.INFO)

load_dotenv()


app = Flask(__name__)

database_url = os.getenv("DATABASE_URL", "sqlite:///users.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.getenv("SECRET_KEY")
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"

db = SQLAlchemy(app)
ALL_PLAYERS = players.get_players()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    display_name = db.Column(db.String(80), nullable=True)
    favorite_team = db.Column(db.String(60), nullable=True)
    coins = db.Column(db.Integer, default=1000, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


with app.app_context():
    db.create_all()


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username', '').strip()
    email    = data.get('email', '').strip()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({'error': 'All fields are required.'}), 400

    try:
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken.'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'An account with that email already exists.'}), 400
        new_user = User(username=username, email=email, password=generate_password_hash(password))
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'Account created. You can now log in.'}), 201
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Something went wrong. Please try again.'}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    try:
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            session['user'] = username
            return jsonify({'user': username})
        return jsonify({'error': 'Invalid credentials.'}), 401
    except Exception:
        return jsonify({'error': 'Something went wrong. Please try again.'}), 500


@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({'message': 'Logged out.'})


@app.route('/api/me')
def me():
    return jsonify({'user': session.get('user')})


# ── Players ───────────────────────────────────────────────────────────────────

@app.route('/api/autocomplete')
@login_required
def autocomplete():
    query = request.args.get('q', '').strip().lower()
    if not query:
        return jsonify([])
    filtered = [p for p in ALL_PLAYERS if query in p['full_name'].lower()]
    filtered.sort(key=lambda p: 0 if p['full_name'].lower().startswith(query) else 1)
    return jsonify(filtered[:5])


BDL_KEY     = os.getenv("BALLDONTLIE_API_KEY", "")
BDL_HEADERS = {"Authorization": BDL_KEY} if BDL_KEY else {}
CURRENT_SEASON = 2024   # BallDontLie uses the year the season starts


def _bdl_find_player(name):
    """Return the first BallDontLie player dict matching name, or None."""
    resp = requests.get(
        'https://api.balldontlie.io/v1/players',
        headers=BDL_HEADERS,
        params={'search': name, 'per_page': 5},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json().get('data', [])
    if not data:
        return None
    name_lower = name.lower()
    for p in data:
        if name_lower in p['first_name'].lower() + ' ' + p['last_name'].lower():
            return p
    return data[0]


def _bdl_season_avg(player_id):
    resp = requests.get(
        'https://api.balldontlie.io/v1/season_averages',
        headers=BDL_HEADERS,
        params={'season': CURRENT_SEASON, 'player_ids[]': player_id},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json().get('data', [])
    if not data:
        return None
    s = data[0]
    return {
        'pts':    round(float(s.get('pts', 0) or 0), 1),
        'reb':    round(float(s.get('reb', 0) or 0), 1),
        'ast':    round(float(s.get('ast', 0) or 0), 1),
        'stl':    round(float(s.get('stl', 0) or 0), 1),
        'blk':    round(float(s.get('blk', 0) or 0), 1),
        'fg3m':   round(float(s.get('fg3m', 0) or 0), 1),
        'season': f"{CURRENT_SEASON}-{str(CURRENT_SEASON + 1)[-2:]}",
    }


def _bdl_recent_games(player_id, n=5):
    resp = requests.get(
        'https://api.balldontlie.io/v1/stats',
        headers=BDL_HEADERS,
        params={
            'seasons[]':    CURRENT_SEASON,
            'player_ids[]': player_id,
            'per_page':     n,
            'sort':         'date',
            'direction':    'desc',
        },
        timeout=10,
    )
    resp.raise_for_status()
    games = []
    for g in resp.json().get('data', []):
        games.append({
            'GAME_DATE': g['game']['date'][:10],
            'PTS':  g.get('pts') or 0,
            'AST':  g.get('ast') or 0,
            'REB':  g.get('reb') or 0,
            'STL':  g.get('stl') or 0,
            'BLK':  g.get('blk') or 0,
            'FG3M': g.get('fg3m') or 0,
        })
    return games


@app.route('/api/player')
@login_required
def player_stats():
    player_name = request.args.get('name', '').strip()
    if not player_name:
        return jsonify({'error': 'Player name required.'}), 400

    # Static lookup (local JSON, no network) — still valid for headshot URL
    nba_match = next((p for p in ALL_PLAYERS if player_name.lower() in p['full_name'].lower()), None)
    nba_id    = nba_match['id'] if nba_match else None

    try:
        bdl = _bdl_find_player(player_name)
        if not bdl:
            return jsonify({'error': f"No player found matching '{player_name}'"}), 404

        logging.info(f"[player] BDL match: {bdl['first_name']} {bdl['last_name']} id={bdl['id']}")

        season_avg   = _bdl_season_avg(bdl['id'])
        recent_games = _bdl_recent_games(bdl['id'])

        team      = bdl.get('team') or {}
        team_id   = team.get('id')
        full_name = f"{bdl['first_name']} {bdl['last_name']}"

        # Best effort headshot from NBA CDN (uses NBA ID if we found one)
        headshot = (
            f"https://cdn.nba.com/headshots/nba/latest/1040x760/{nba_id}.png"
            if nba_id else ''
        )

        return jsonify({
            'player': {
                'id':        bdl['id'],
                'name':      full_name,
                'age':       bdl.get('age'),
                'height':    bdl.get('height', ''),
                'weight':    bdl.get('weight', ''),
                'exp':       '',
                'team_id':   team_id,
                'team_logo': f"https://cdn.nba.com/logos/nba/{team_id}/primary/L/logo.svg" if team_id else '',
                'headshot':  headshot,
            },
            'season_avg':   season_avg,
            'recent_games': recent_games,
        })
    except Exception as e:
        logging.error(f"[player] FAILED: {e}")
        logging.error(traceback.format_exc())
        return jsonify({'error': 'Failed to load player data.', 'detail': str(e)}), 500


@app.route('/api/compare')
@login_required
def compare():
    p1 = request.args.get('player1', '').strip()
    p2 = request.args.get('player2', '').strip()

    def get_stats(name):
        try:
            bdl = _bdl_find_player(name)
            if not bdl:
                return None, None
            full_name = f"{bdl['first_name']} {bdl['last_name']}"
            games = _bdl_recent_games(bdl['id'])
            return full_name, games
        except Exception:
            return None, None

    name1, stats1 = get_stats(p1)
    name2, stats2 = get_stats(p2)

    if stats1 is None or stats2 is None:
        return jsonify({'error': 'One or both players could not be found.'}), 404

    return jsonify({
        'player1': {'name': name1, 'games': stats1},
        'player2': {'name': name2, 'games': stats2},
    })


# ── Scoreboard (ESPN) ─────────────────────────────────────────────────────────

@app.route('/api/scoreboard')
def scoreboard():
    try:
        resp = requests.get(
            'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
            timeout=8
        )
        events = resp.json().get('events', [])
        games = []
        for event in events:
            comp        = event['competitions'][0]
            competitors = comp['competitors']
            home = next(c for c in competitors if c['homeAway'] == 'home')
            away = next(c for c in competitors if c['homeAway'] == 'away')

            status      = event['status']
            status_type = status['type']
            if status_type['completed']:
                status_text = 'Final'
            elif status['period'] > 0:
                status_text = f"Q{status['period']} {status.get('displayClock', '').strip()}"
            else:
                status_text = event.get('status', {}).get('type', {}).get('shortDetail', 'Scheduled')

            def team_data(c):
                score = c.get('score')
                return {
                    'name':   c['team']['displayName'],
                    'pts':    int(score) if score and score != '0' or status_type['completed'] else None,
                    'record': c['records'][0]['summary'] if c.get('records') else '',
                    'logo':   c['team'].get('logo', ''),
                }

            games.append({'status': status_text, 'visitor': team_data(away), 'home': team_data(home)})
        return jsonify({'games': games})
    except Exception as e:
        print(f"Scoreboard error: {e}")
        return jsonify({'games': [], 'error': str(e)})


# ── Standings (ESPN) ──────────────────────────────────────────────────────────

@app.route('/api/standings')
def standings():
    try:
        resp = requests.get(
            'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings',
            timeout=8
        )
        east, west = [], []
        for conf in resp.json().get('children', []):
            teams = []
            for entry in conf.get('standings', {}).get('entries', []):
                team  = entry['team']
                stats = {s['name']: s['value'] for s in entry.get('stats', [])}
                teams.append({
                    'name':   team['displayName'],
                    'logo':   team['logos'][0]['href'] if team.get('logos') else '',
                    'wins':   int(stats.get('wins', 0)),
                    'losses': int(stats.get('losses', 0)),
                    'pct':    round(float(stats.get('winPercent', 0)), 3),
                    'home':   stats.get('homeRecordSummary', ''),
                    'road':   stats.get('roadRecordSummary', ''),
                    'l10':    stats.get('Last Ten Games', stats.get('last10RecordSummary', '')),
                    'streak': stats.get('streakSummary', stats.get('streak', '')),
                })
            if 'East' in conf.get('name', ''):
                east = teams
            else:
                west = teams
        return jsonify({'east': east, 'west': west})
    except Exception as e:
        print(f"Standings error: {e}")
        return jsonify({'east': [], 'west': [], 'error': str(e)})


# ── Chat ──────────────────────────────────────────────────────────────────────

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.route('/api/chat', methods=['POST'])
@login_required
def chat():
    data     = request.get_json()
    messages = data.get('messages')
    if not messages or not isinstance(messages, list):
        return jsonify({'error': 'Invalid message format.'}), 400
    try:
        response = client.chat.completions.create(
            model='llama-3.1-8b-instant',
            messages=messages
        )
        return jsonify({'response': response.choices[0].message.content.strip()})
    except Exception:
        return jsonify({'error': 'Something went wrong with the assistant.'}), 500


# ── Serve React ───────────────────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    dist = os.path.join(app.root_path, 'static', 'dist')
    if path and os.path.exists(os.path.join(dist, path)):
        return send_from_directory(dist, path)
    return send_from_directory(dist, 'index.html')


if __name__ == '__main__':
    app.run(debug=True)
