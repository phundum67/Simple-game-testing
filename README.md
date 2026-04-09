# Chaos Runner

Chaos Runner is an original full-stack browser platformer built with React on the frontend and Flask + SQLite on the backend. Players pick a chaotic hero, complete side quests, open random mystery boxes, and submit their high score to an online leaderboard.

## Stack

- Frontend: React + Vite + HTML5 canvas
- Backend: Flask + Flask-CORS
- Database: SQLite

## Project Structure

```text
chaos-runner/
  backend/
    .env.example
    app.py
    database.py
    pythonanywhere_wsgi.py.template
    requirements.txt
    runtime.txt
    seed_data.py
    wsgi.py
  frontend/
    .env.example
    public/audio/README.txt
    src/
      App.jsx
      GameCanvas.jsx
      api.js
      styles.css
      game/
        audio.js
        constants.js
        engine.js
        data/
          characters.js
          levels.js
  README.md
  netlify.toml
  render.yaml
```

## Gameplay Features

- Main menu, instructions page, character select, and leaderboard page
- Five side-scrolling levels:
  - Neon Night Shift
  - Dream Soup Boulevard
  - Jungle Ruins of LOL
  - Glitch Palace.exe
  - Server Farm Skyway
- Original meme-energy characters with unique passive abilities
- Bonus character: Cache Money, a score-boosting CDN wizard
- Mystery boxes with random power-ups
- Multiple enemy types plus mini-bosses
- Optional side quests for bonus score
- Score system based on coins, enemies, level clears, time left, and quest completion
- Online leaderboard submission with username validation

## Backend API

The Flask API exposes these routes:

- `GET /api/health`
- `GET /api/characters`
- `GET /api/leaderboard?limit=10`
- `POST /api/scores`

Example score payload:

```json
{
  "username": "ByteRunner",
  "score": 6320,
  "characterId": "sixty-hex",
  "resultType": "win",
  "stats": {
    "coins": 41,
    "enemiesDefeated": 7,
    "sideQuestsCompleted": 5,
    "levelsCleared": 4
  }
}
```

## Local Setup

### 1. Run the backend

```bash
cd chaos-runner/backend
python -m pip install -r requirements.txt
python app.py
```

The Flask server runs on `http://127.0.0.1:5000` and creates `leaderboard.db` automatically with sample starter data.

### 2. Run the frontend

```bash
cd chaos-runner/frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://127.0.0.1:5173`.

## How Frontend And Backend Connect

- The React app calls `/api/characters` to load the selectable roster
- The React app calls `/api/leaderboard` to render the high score table
- After a run ends, the score form posts to `/api/scores`
- `vite.config.js` proxies `/api` requests to the Flask server during local development

## Beginner-Friendly Extension Points

- Add more heroes by editing:
  - `frontend/src/game/data/characters.js`
  - `backend/seed_data.py`
- Add new stages by editing `frontend/src/game/data/levels.js`
- Replace generated beeps with real audio in `frontend/public/audio/`
- Swap SQLite later by replacing the functions in `backend/database.py` with another database adapter while keeping the Flask routes unchanged

## Deployment Later

## No-Credit-Card Deploy Path

The easiest free-friendly route for this project is:

- Frontend on Netlify
- Backend on PythonAnywhere

That avoids the Render credit-card check while keeping the full game and leaderboard online.

### Netlify Frontend

This repo now includes [netlify.toml](/d:/booking%20app%20AI/chaos-runner/netlify.toml), so Netlify can build the frontend from the `frontend/` folder automatically.

Use these settings in Netlify:

- Base directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`

Set this environment variable in Netlify before the first production build:

```bash
VITE_API_URL=https://your-pythonanywhere-username.pythonanywhere.com
```

Then redeploy the site.

### PythonAnywhere Backend

Upload or clone the repo to PythonAnywhere so the backend folder exists at something like:

```bash
/home/your-pythonanywhere-username/Simple-game-testing/backend
```

In a PythonAnywhere Bash console:

```bash
cd ~/Simple-game-testing/backend
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mkdir -p ~/chaos-runner-data
```

Then create the web app in the PythonAnywhere dashboard:

- Framework: Manual configuration
- Python version: pick the newest available 3.x version

Use [backend/pythonanywhere_wsgi.py.template](/d:/booking%20app%20AI/chaos-runner/backend/pythonanywhere_wsgi.py.template) as the starting point for your WSGI config file.

Important values to set there:

- `PROJECT_ROOT` should point to your uploaded repo backend folder
- `CHAOS_RUNNER_DB` should point to a writable persistent path like:
  `/home/your-pythonanywhere-username/chaos-runner-data/leaderboard.db`
- `CHAOS_RUNNER_CORS_ORIGINS` should be your Netlify URL

You can also copy values from [backend/.env.example](/d:/booking%20app%20AI/chaos-runner/backend/.env.example).

After saving the WSGI file, reload the PythonAnywhere web app.

### Final Wiring

1. Deploy backend to PythonAnywhere
2. Copy the PythonAnywhere app URL
3. Set `VITE_API_URL` in Netlify to that backend URL
4. Redeploy Netlify
5. Set `CHAOS_RUNNER_CORS_ORIGINS` in PythonAnywhere to the final Netlify URL
6. Reload the PythonAnywhere app

### Leaderboard Storage Note

SQLite is still fine for a first release on PythonAnywhere because you can store the database in your home directory. If the game grows later, swap [backend/database.py](/d:/booking%20app%20AI/chaos-runner/backend/database.py) to PostgreSQL.

### Frontend

- Run `npm run build`
- Deploy the generated `frontend/dist/` folder to a static host such as Netlify, Vercel, GitHub Pages, or Cloudflare Pages

### Backend

- Deploy the Flask app to Render, Railway, Fly.io, PythonAnywhere, or a VPS
- Set `CHAOS_RUNNER_DB` if you want the database file stored in a custom location
- Set `CHAOS_RUNNER_CORS_ORIGINS` to your deployed frontend URL for production CORS safety
- For larger production deployments, swap SQLite for PostgreSQL or MySQL by keeping the API layer the same and changing the storage implementation inside `database.py`

### Render Blueprint

This repo now includes `render.yaml`, so you can deploy both services on Render:

- Backend service uses `gunicorn wsgi:app`
- Frontend service builds the Vite app from `frontend/`
- Set `VITE_API_URL` on the static site to your deployed backend URL

### Production API URL

When the backend is deployed on a different origin, create a frontend `.env` file with:

```bash
VITE_API_URL=https://your-backend-domain.com
```

Then rebuild the frontend before deployment.
