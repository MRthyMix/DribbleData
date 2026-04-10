from flask import Flask, request, session, jsonify, send_from_directory
from nba_api.stats.static import players
from nba_api.stats.endpoints import commonplayerinfo, playercareerstats, playergamelog, scoreboardv2, leaguestandings as lg_standings
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from functools import wraps
from dotenv import load_dotenv
import os
from groq import Groq

load_dotenv()

# Headers required to avoid being blocked by NBA's API on cloud servers
NBA_HEADERS = {
    'Host': 'stats.nba.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'x-nba-stats-origin': 'stats',
    'x-nba-stats-token': 'true',
    'Connection': 'keep-alive',
    'Referer': 'https://www.nba.com/',
    'Origin': 'https://www.nba.com',
}

app = Flask(__name__)

database_url = os.getenv("DATABASE_URL")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.getenv("SECRET_KEY")
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = True

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


@app.route('/api/player')
@login_required
def player_stats():
    player_name = request.args.get('name', '').strip()
    if not player_name:
        return jsonify({'error': 'Player name required.'}), 400

    match = next((p for p in players.get_players()
                  if player_name.lower() in p['full_name'].lower()), None)
    if not match:
        return jsonify({'error': f"No player found matching '{player_name}'"}), 404

    player_id = match['id']
    try:
        game_log = playergamelog.PlayerGameLog(
            player_id=player_id, season_type_all_star='Regular Season',
            timeout=8, headers=NBA_HEADERS
        ).get_data_frames()[0]
        last_5 = game_log[['GAME_DATE', 'PTS', 'AST', 'REB', 'STL', 'BLK', 'FG3M']].dropna().head(5)
        recent_games = last_5.to_dict('records')

        career_df = playercareerstats.PlayerCareerStats(
            player_id=player_id, per_mode36='PerGame',
            timeout=8, headers=NBA_HEADERS
        ).get_data_frames()[0]
        season_avg = None
        if not career_df.empty:
            row = career_df.iloc[-1]
            season_avg = {
                'pts':    round(float(row['PTS']), 1),
                'reb':    round(float(row['REB']), 1),
                'ast':    round(float(row['AST']), 1),
                'stl':    round(float(row['STL']), 1),
                'blk':    round(float(row['BLK']), 1),
                'fg3m':   round(float(row['FG3M']), 1),
                'season': row['SEASON_ID'],
            }

        info   = commonplayerinfo.CommonPlayerInfo(player_id=player_id, timeout=8, headers=NBA_HEADERS)
        bio_df = info.get_data_frames()[0]
        birth_str = bio_df.loc[0, 'BIRTHDATE'][:10]
        computed_age = None
        try:
            bdate = datetime.strptime(birth_str, '%Y-%m-%d').date()
            today = datetime.today().date()
            computed_age = today.year - bdate.year - ((today.month, today.day) < (bdate.month, bdate.day))
        except ValueError:
            pass

        team_id = int(bio_df.loc[0, 'TEAM_ID'])
        return jsonify({
            'player': {
                'id':       player_id,
                'name':     bio_df.loc[0, 'DISPLAY_FIRST_LAST'],
                'age':      computed_age,
                'height':   bio_df.loc[0, 'HEIGHT'],
                'weight':   bio_df.loc[0, 'WEIGHT'],
                'exp':      bio_df.loc[0, 'SEASON_EXP'],
                'team_id':  team_id,
                'team_logo': f"https://cdn.nba.com/logos/nba/{team_id}/primary/L/logo.svg",
                'headshot':  f"https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png",
            },
            'season_avg':   season_avg,
            'recent_games': recent_games,
        })
    except Exception:
        return jsonify({'error': 'Failed to load player data.'}), 500


@app.route('/api/compare')
@login_required
def compare():
    p1 = request.args.get('player1', '').strip()
    p2 = request.args.get('player2', '').strip()

    def get_stats(name):
        all_p = players.get_players()
        match = next((p for p in all_p if name.lower() in p['full_name'].lower()), None)
        if not match:
            return None, None
        pid  = match['id']
        logs = playergamelog.PlayerGameLog(
            player_id=pid, season_type_all_star='Regular Season',
            timeout=8, headers=NBA_HEADERS
        ).get_data_frames()[0]
        last_5 = logs[['GAME_DATE', 'PTS', 'AST', 'REB']].head(5)
        return match['full_name'], last_5.to_dict('records')

    name1, stats1 = get_stats(p1)
    name2, stats2 = get_stats(p2)

    if stats1 is None or stats2 is None:
        return jsonify({'error': 'One or both players could not be found.'}), 404

    return jsonify({
        'player1': {'name': name1, 'games': stats1},
        'player2': {'name': name2, 'games': stats2},
    })


# ── Scoreboard ────────────────────────────────────────────────────────────────

@app.route('/api/scoreboard')
def scoreboard():
    try:
        board    = scoreboardv2.ScoreboardV2(timeout=8, headers=NBA_HEADERS)
        games_df = board.get_data_frames()[0]
        lines_df = board.get_data_frames()[1]
        games = []
        for _, game in games_df.iterrows():
            gid   = game['GAME_ID']
            teams = lines_df[lines_df['GAME_ID'] == gid]
            if len(teams) < 2:
                continue
            vis  = teams.iloc[0]
            home = teams.iloc[1]

            def pts(row):
                v = row['PTS']
                return int(v) if v and str(v) != 'nan' else None

            games.append({
                'status':  game['GAME_STATUS_TEXT'].strip(),
                'visitor': {'name': f"{vis['TEAM_CITY_NAME']} {vis['TEAM_ABBREVIATION']}",
                            'pts': pts(vis), 'record': vis['TEAM_WINS_LOSSES'],
                            'team_id': int(game['VISITOR_TEAM_ID'])},
                'home':    {'name': f"{home['TEAM_CITY_NAME']} {home['TEAM_ABBREVIATION']}",
                            'pts': pts(home), 'record': home['TEAM_WINS_LOSSES'],
                            'team_id': int(game['HOME_TEAM_ID'])},
            })
        return jsonify({'games': games})
    except Exception as e:
        print(f"Scoreboard error: {e}")
        return jsonify({'games': [], 'error': str(e)})


# ── Standings ─────────────────────────────────────────────────────────────────

@app.route('/api/standings')
def standings():
    try:
        df   = lg_standings.LeagueStandings(timeout=8, headers=NBA_HEADERS).get_data_frames()[0]
        cols = ['TeamID', 'TeamCity', 'TeamName', 'WINS', 'LOSSES',
                'WinPCT', 'HOME', 'ROAD', 'L10', 'strCurrentStreak']
        east = df[df['Conference'] == 'East'][cols].to_dict('records')
        west = df[df['Conference'] == 'West'][cols].to_dict('records')
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
