# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent-based mathematical model for studying economic migration dynamics, with an interactive React dashboard. The model tracks agents through four states: **S** (Susceptible), **I** (Intent to migrate), **M** (Migrated), **R** (Returned).

## Commands

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build to dist/
```

Both must run simultaneously for the full app. The frontend proxies API calls to `http://localhost:8000`.

## Architecture

### Backend (`backend/`)

- **`simulation.py`** — Core engine. `SimulationConfig` dataclass holds all parameters. Each run creates agents with individual attributes (wages, costs, psychological traits), builds a weighted social network (relatives, Facebook, TikTok ties), then iterates the simulation loop.

  Each time step:
  1. Computes social network influence per agent
  2. Applies diaspora, media, survivorship bias, and optimism bias effects
  3. Calculates utility differential `U_mig - U_stay`
  4. Applies logistic transition probabilities: S→I, I→M, M→R
  5. Generates a macro diffusion reference trajectory `m(t)` for comparison

- **`api.py`** — Single FastAPI endpoint `POST /simulate`. Validates input via Pydantic (`SimulationRequest`), runs the simulation, returns trajectory history, final state counts, macro diffusion comparison, and summary stats. CORS is configured for `localhost:5173`.

### Frontend (`frontend/src/`)

Single-page React app (`App.jsx`):
- **Left panel**: 13 adjustable parameters with validated input ranges
- **Right panel**: Summary metrics + three Recharts visualizations:
  - State trajectories over time (S, I, M, R lines)
  - Final state composition (pie chart)
  - Agent-based vs. macro diffusion comparison (line chart)

### API Contract

`POST /simulate` accepts 16 parameters (agents count, time steps, wages, migration cost, network edge probability, Facebook/TikTok influence, optimism delta, initial state fractions, utility coefficients β3/β4/β5, random seed). Returns `{ config, history, macro_diffusion, final_counts, summary }`.

## Key Model Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| `n_agents` | 50–5000 | Number of simulated agents |
| `n_steps` | 10–300 | Simulation time steps |
| `local_wage_mean` | 100–5000 | Mean local wage |
| `external_wage_mean` | 100–10000 | Mean external (destination) wage |
| `migration_cost_mean` | 50–5000 | Mean one-time migration cost |
| `edge_prob` | 0.001–0.5 | Social network connectivity |
| `facebook_influence` / `tiktok_influence` | 0–1 | Media channel weights |
| `optimism_delta` | 0–1 | Optimism bias magnitude |
| `beta_3/4/5` | coefficients | Network, diaspora, media utility weights |
