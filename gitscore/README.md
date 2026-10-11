# GitScore — Gihub Analytics & Reputation Scoring

A full-stack web app that analyzes any X (Twitter) account and generates a reputation score, engagement insights, viral content patterns, and optimal posting times.



## Features

- **Social Score** (0–1000) with letter grade (S / A / B / C / D)
- **Banger Detection** — posts with ≥1,000 engagement flagged as viral
- **Creator Radar** — multi-dimensional chart: virality, consistency, reach, engagement, output
- **Best Posting Hours** — bar chart showing which hours drive the most engagement
- **Top 5 Posts** — clickable, linked to live tweet
- **Smart Insights** — auto-generated recommendations based on data

---

## Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI + Python 3.11 |
| Data | X (Twitter) API v2 (free tier) |
| Frontend | React 18 + Vite |
| Charts | Recharts |
| Styling | Custom CSS (no UI lib) |

---

## Getting Started

### 1. Get a Github Bearer Token

1. Go to Github Api platform
2. Create a project and app
3. Copy your **Bearer Token** (free tier is enough — gives read access)

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your TWITTER_BEARER_TOKEN

# Run the server
python run.py
```

API will be live at `http://localhost:8000`

Test it: `http://localhost:8000/analyze/elonmusk`

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# VITE_API_URL=http://localhost:8000 (default, no change needed for local dev)

# Run dev server
npm run dev
```

Frontend will be live at `http://localhost:5173`

---

## API Reference

### `GET /analyze/{username}`

Analyzes a Twitter/X account.


}
```

### `GET /health`

Returns `{"status": "ok"}` — useful for uptime monitoring.

---

## Scoring Algorithm

The Social Score (0–1000) is calculated as:

```
score = (engagement_rate × 30)
      + (consistency_score × 20)
      + (viral_bonus × 30)
      + (follower_score × 20)
```

Where:
- `engagement_rate` = avg engagement / followers × 100
- `consistency_score` = min(tweets_analyzed / 50, 1) × 100
- `viral_bonus` = banger_rate × 200
- `follower_score` = log10(followers) × 10

---

## Deployment

### Backend (Railway / Render / Fly.io)

```bash
# Set environment variable on your host:
TWITTER_BEARER_TOKEN=your_token_here

# Start command:
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Frontend (Vercel / Netlify)

```bash
# Build command:
npm run build

# Output directory:
dist

# Environment variable:
VITE_API_URL=https://your-backend-url.railway.app
```

---

## Roadmap

- [ ] Comparison tool (two users side-by-side)
- [ ] Topic/keyword analysis
- [ ] Leaderboard (public scores)
- [ ] AI-generated roast/praise based on profile
- [ ] CSV export
- [ ] Webhook alerts for score changes

---

## License

MIT — free to use, fork, and ship.
