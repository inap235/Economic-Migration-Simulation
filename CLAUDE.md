# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent-based mathematical model for studying economic migration dynamics in Moldova. The model tracks agents through four states: **S** (Susceptible / Staying), **I** (Intent to migrate), **M** (Migrated), **R** (Returned).

There are two independent simulation engines:
- **Backend** (`backend/`) — Python/NumPy engine exposed via FastAPI. Used for rigorous parameter sweeps and macro-diffusion comparison.
- **Frontend** (`frontend/src/simulation/`) — JavaScript engine running entirely in the browser. Powers the real-time Canvas dashboard; does **not** call the backend API.

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

The frontend runs standalone — the backend is optional (only needed if you want the `/simulate` API endpoint).

---

## Architecture

### Backend (`backend/`)

- **`simulation.py`** — Core NumPy engine. `SimulationConfig` dataclass holds all parameters. Each run creates agents with individual attributes (wages, costs, psychological traits), builds a weighted social network (relatives, Facebook, TikTok ties), then iterates the simulation loop.

  Each time step:
  1. Computes social network influence per agent (weighted adjacency matrix multiply)
  2. Applies survivorship bias, optimism bias, and media influence
  3. Calculates utility differential `U_mig - U_stay`
  4. Applies logistic transition probabilities: S→I, I→M, M→R
  5. Generates a macro Bass-diffusion reference trajectory `m(t)` for comparison

- **`api.py`** — Single FastAPI endpoint `POST /simulate`. Validates input via Pydantic (`SimulationRequest`), runs the simulation, returns trajectory history, final state counts, macro diffusion comparison, and summary stats. CORS configured for `localhost:5173`.

### Frontend (`frontend/src/`)

#### Application shell (`App.jsx`)
Three-phase lifecycle: `intro` (2.8 s splash) → `spawning` (batch-spawn agents) → `running` (main tick loop). State machine driven by `phase` and `running` React state.

#### Components
| File | Role |
|------|------|
| `components/SimCanvas.jsx` | Canvas renderer — orthographic globe, Moldova map, agent dots, halos, network edges, border cluster glows, legend, date stamp, hover tooltip |
| `components/LeftPanel.jsx` | Left sidebar — animated state counters, 5 slider controls, Run/Pause/Reset buttons, sparkline chart |
| `components/EventFeed.jsx` | Right sidebar — live "Signal Feed" listing the last 20 state transitions with channel icon, Z-score, and neighbor % |
| `components/Ticker.jsx` | Bottom status bar |
| `components/MiniChart.jsx` | SVG sparkline of migrated % over the last 60 ticks |

#### Frontend simulation engine (`frontend/src/simulation/`)

- **`Agent.js`** — Individual agent class. Each agent holds:
  - Economic params: `w_loc`, `w_ext`, `cost` (normalised to ~0–4 range)
  - Psychological params: `bias_opt` (optimism δ), `bias_surv` (survivorship), `f_home`, `abroad_adapt`, `threshold`
  - Media sensitivity: `fb_influence`, `tiktok_influence`
  - Network influence (written each tick): `N_i` (fraction of connections in state M), `D_i` (fraction in state I)
  - Geographical state: `lat`, `lon`, `vLat`, `vLon`, `region`, `migDir` ('west'|'east'), `nearBorder`
  - `computeZ(sliders)` — migration utility score; `move()` — per-tick position update

- **`Simulation.js`** — Orchestrator:
  - `spawnBatch(count)` — progressive agent spawning; calls `_buildNetwork()` when complete
  - `_buildNetwork()` — random adjacency (3–8 connections per agent)
  - `_updateNetworkInfluence()` — computes `N_i` and `D_i` for every agent from the current network snapshot (called once per tick before any transitions, preventing cascade effects)
  - `tick()` — evaluates all state transitions, calls `agent.move()`, collects events

- **`MapData.js`** — Moldova geography constants:
  - 6 weighted regions: Chișinău, Nord, Sud, Centru, Găgăuzia, Transnistria
  - Border exit targets: `WEST_EXIT` (Prut River / Romania), `EAST_EXIT` (Transnistrian corridor)
  - External emigrant zones: `WEST_ZONE` (EU/Romania side), `EAST_ZONE` (Ukraine side)
  - `assignMigDir(agent)` — 87% westward for most regions; Transnistria 55% westward (empirical)

- **`config.js`** — Global constants: `REGIONS`, `GEO` bounding box, `MOLDOVA_BORDER` polygon, `COLORS`, `N_AGENTS` (2000), `TICK_MS` (180), `DEFAULT_SLIDERS`

---

## Simulation Logic

### State machine transitions

| Transition | Formula | Notes |
|-----------|---------|-------|
| S → I | `P = sigmoid(Z – threshold×0.4) × 0.02` | Slow diffusion into intent |
| I → M | `P = sigmoid(0.3 + 0.8Z + 0.5×N_i) × 0.05` | Diaspora pull accelerates commitment |
| M → R | `P = sigmoid(–1 + 0.6×f_home – 0.4×abroad_adapt) × 0.008` | Rare; driven by homesickness |
| R → S | `P = 0.01` | Return to susceptible pool |

### Migration utility score Z

```
Z = –1.2
  + 2.5 × (w_ext×(1+δ) – w_loc) × wageGap        [wage differential]
  – 1.8 × cost × migrationCost                     [migration cost]
  + 1.5 × (N_i + D_i) × networkStrength            [aggregate social pressure]
  + 2.0 × N_i                                       [diaspora pull — migrated neighbors]
  + 1.2 × D_i                                       [peer contagion — intending neighbors]
  + 0.9 × tiktok_influence × tiktokPressure         [TikTok signal]
  + 0.8 × bias_surv                                 [survivorship bias]
```

**N_i vs D_i split**: `N_i` (fraction of connections already migrated) captures diaspora pull — hearing success stories from abroad. `D_i` (fraction with intent) captures peer contagion — social proof from peers who are also considering leaving. Both are computed from the previous tick's snapshot.

### Geographical movement

Each tick, `agent.move()` runs state-dependent physics:
- **S** — Brownian noise + soft attraction toward home region centroid (`HOME_PULL = 0.003`)
- **I** — Directed drift toward border exit (`SPEED_DRIFT = 0.0095°/tick`); slows to 18% speed within `0.32°` of the exit (creating visible **border clusters**)
- **M** — Light Brownian drift inside the external emigrant zone (teleported there on I→M)
- **R** — Directed return toward home region centroid (`SPEED_RETURN = 0.011°/tick`); switches to Brownian once within `0.10°`

### Canvas rendering (SimCanvas)

- **Orthographic globe** (top-left inset) — shows Moldova highlighted; glow intensity and fill opacity driven by current migration fraction
- **Main map** — equirectangular projection over `GEO` bounding box (`45–49°N, 24.3–31.8°E`)
- **Network edges** — thin lines connecting I↔M neighbors (capped at 3 per agent for performance)
- **Border cluster glow** — amber halo centred on waiting I-agents at each exit; radius scales with cluster size (min 4 agents to trigger)
- **Agent halos** — radial gradient flash on state transition, decays 0.08/tick
- **Hover tooltip** — shows agent ID, region, state, Z-score, `N_i %`, `D_i %`

---

## Interactive Sliders

| Slider | Range | Effect |
|--------|-------|--------|
| `wageGap` | 0.5–2.0 | Multiplier on wage differential term in Z |
| `tiktokPressure` | 0.0–1.0 | Scales TikTok influence on Z |
| `migrationCost` | 0.5–2.0 | Multiplier on cost term in Z |
| `networkStrength` | 0.5–2.0 | Scales aggregate social pressure `(N_i + D_i)` |
| `cognitiveBias` | 0.0–1.0 | Scales optimism δ multiplier on perceived external wage |

---

## Backend API Contract

`POST /simulate` accepts 16+ parameters (agents count, time steps, wages, migration cost, network edge probability, Facebook/TikTok influence, optimism delta, initial state fractions, utility coefficients β3/β4/β5, random seed). Returns `{ config, history, macro_diffusion, final_counts, summary }`.

### Key backend model parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| `n_agents` | 50–5000 | Number of simulated agents |
| `steps` | 10–300 | Simulation time steps |
| `wage_local_mean` | — | Mean local wage (default 700) |
| `wage_external_mean` | — | Mean external wage (default 1900) |
| `migration_cost_mean` | — | Mean one-time migration cost (default 420) |
| `network_edge_prob` | 0.001–0.5 | Social network connectivity |
| `lambda_facebook` / `lambda_tiktok` | 0–1 | Media channel tie weights |
| `optimism_delta_mean` | 0–1 | Mean optimism bias magnitude |
| `beta_3/4/5/6/7` | coefficients | Network, diaspora, media, survivorship, optimism utility weights |
| `gamma_0–3` / `eta_0–3` | coefficients | Logistic transition coefficients for I→M and M→R |
