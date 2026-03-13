# WR Draft — Wild Rift Competitive Coach Tool

A team coaching and draft preparation tool for **League of Legends: Wild Rift** competitive play.

## Features

### Core (v1)
- **Match Data Extractor** — Manual entry of competitive match data (teams, bans, picks, results, notes)
- **Draft Board** — Interactive ban/pick interface with notes, ratings, and first-3 ban/pick focus
- **Squad Analyzer** — Team composition analysis: damage balance, CC, synergy, scaling, role coverage

### Planned (v2+)
- Automated data ingestion from match screenshots / OCR
- Player performance tracking & champion pools
- Scrim history and trend analysis
- Opponent scouting reports
- Meta shift timeline
- Export reports (PDF/image for team review)

## SOP Workflow
1. **Ingest data** — Enter competitive match results to build a meta picture
2. **Analyze meta** — Review pick/ban rates, win rates, role trends
3. **Draft prep** — Walk through first 3 bans/picks with the team, use notes and recommendations
4. **Squad check** — Evaluate team comp strength before locking in

## Tech Stack

| Layer       | Technology              | Purpose                           |
|-------------|-------------------------|-----------------------------------|
| Backend     | Python + FastAPI        | Data processing, analysis engine  |
| Frontend    | TypeScript + HTML/CSS   | Interactive UI                    |
| Data        | JSON files (→ SQLite)   | Match & champion storage          |
| Build       | Vite                    | Frontend bundling & dev server    |

## Project Structure

```
wr-draft/
├── backend/
│   ├── main.py              # FastAPI app entry
│   ├── requirements.txt
│   ├── models/               # Pydantic data models
│   ├── services/             # Business logic
│   ├── api/                  # Route handlers
│   └── data/                 # Champion & match JSON data
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts
│       ├── api.ts            # Backend API client
│       ├── components/       # UI modules
│       ├── models/           # TypeScript types
│       └── styles/           # CSS
└── README.md
```

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Server runs on `http://localhost:8000` (API docs at `/docs`).

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Dev server runs on `http://localhost:5173`, proxied to backend.

## Champion Data

Champions are stored in `backend/data/champions.json`. Each champion has:
- Roles (Baron, Jungle, Mid, Dragon, Support)
- Damage type (AD / AP / Mixed)
- Sub-class (Tank, Fighter, Assassin, Mage, Marksman, Enchanter, Vanguard)
- Tags for analysis (CC type, scaling phase, mobility, etc.)

To add or update champions, edit the JSON file directly or use the data entry UI.
![![![![alt text](image-3.png)](image-2.png)](image-1.png)](image.png)