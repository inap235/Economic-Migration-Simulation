# Economic Migration Simulation — Complete Presentation Guide

---

## 1. Repository Overview

### What This Project Does (Simple)
This is a **computer simulation of why people leave Moldova**. It creates 2,000 virtual people (agents), gives each one a job, a wage, a personality, and a social network, then watches who decides to emigrate, who actually leaves, and who comes back — all in real time on an interactive map.

### Main Goal
To model and visualize economic migration dynamics in Moldova using an agent-based approach, combining social network theory, economic utility theory, and behavioral psychology.

### Real-World Problem
Moldova has one of the highest emigration rates in Europe (~30% of its working-age population has left). Economists want to understand: *what drives this?* Is it wages? Social pressure? TikTok? All three? This simulation lets you test those hypotheses by moving sliders.

---

### 30-Second Pitch
> "We built an agent-based simulation of economic migration in Moldova. Two thousand virtual agents each have wages, personalities, and social connections. Every tick of the simulation they ask themselves: 'Should I leave?' Based on the math, some form intent, some migrate, and some return. You can change sliders — wage gap, TikTok influence, migration cost — and watch migration patterns shift live on a map."

### 1-Minute Pitch
> "Moldova has one of the highest emigration rates in Europe, and economists struggle to explain exactly which factors push people to leave. We built a mathematical model called SIMR — four states: Staying, Intent, Migrated, Returned — borrowed from epidemic diffusion models but applied to migration.
>
> Each agent has real Moldova-calibrated wage distributions, psychological traits like optimism bias and survivorship bias, and a social network. Every simulation tick, a utility function called Z is computed — it weighs wages, migration cost, social pressure from neighbors, and media influence. If Z is high enough, an agent forms intent; if their neighbors are also leaving, they commit and migrate.
>
> The visualization you see is a live simulation: 2,000 agents on a real Moldova map, clustering at the Romanian border, crossing into the EU, some returning home. You can adjust sliders in real time and watch migration patterns change immediately.
>
> The model is inspired by epidemic diffusion theory — migration spreads through social networks the same way a virus spreads through a population."

### 3-Minute Pitch
> (Use the 1-minute version, then add:)
>
> "The simulation has two independent engines. The **frontend engine** — written in JavaScript — runs entirely in the browser. Agents exist as objects, each carrying their own economic and psychological parameters. Every 180 milliseconds, a tick runs: we first snapshot the social network, then for every agent we compute Z — the migration utility score — and draw a random number. If the draw beats a threshold, the agent changes state. The agent then moves on the canvas: Staying agents drift with Brownian noise near their home region, Intent agents walk toward the Romanian border at the Prut River, Migrated agents appear in the EU zone, and Returned agents walk home.
>
> The **backend** — Python/FastAPI — does the same math with NumPy matrix operations, which is much faster for running many simulations with different parameters. It also computes a Bass diffusion reference trajectory — the classic technology adoption model — as a macro-level comparison.
>
> The UI shows a live signal feed of every state transition, a sparkline of migration percentage over time, a finite automaton diagram that animates particles along transition edges, and an orthographic globe showing Moldova's position."

---

## 2. Architecture Analysis

### Folder Structure
```
Economic-Migration-Simulation/
├── backend/
│   ├── simulation.py     ← Core NumPy simulation engine
│   ├── api.py            ← FastAPI REST endpoint
│   └── requirements.txt  ← Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    ← Root component, state machine
│   │   ├── config.js                  ← Global constants (N_AGENTS, colors, regions)
│   │   ├── simulation/
│   │   │   ├── Agent.js               ← Agent class (state, Z-score, movement)
│   │   │   ├── Simulation.js          ← Orchestrator (tick loop, network)
│   │   │   └── MapData.js             ← Moldova geography, exit points
│   │   └── components/
│   │       ├── SimCanvas.jsx          ← Canvas renderer (map, dots, globe)
│   │       ├── LeftPanel.jsx          ← Sliders, counters, sparkline, automaton
│   │       ├── AutomatonPanel.jsx     ← SVG finite automaton with particles
│   │       ├── EventFeed.jsx          ← Right sidebar, live signal feed
│   │       ├── MiniChart.jsx          ← SVG sparkline chart
│   │       └── Ticker.jsx             ← Bottom status bar
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── docs/                 ← Design specs and plans
```

### Role of Each Key File

| File | Role | What breaks if removed |
|------|------|----------------------|
| `Agent.js` | Single agent: parameters, Z formula, movement physics | Nothing moves, no agents exist |
| `Simulation.js` | Orchestrates all agents, runs ticks, builds social network | Simulation stops entirely |
| `MapData.js` | Moldova regions, border crossing coordinates | Agents have no geography |
| `config.js` | All global constants and defaults | Everything referencing N_AGENTS, COLORS, GEO breaks |
| `App.jsx` | Three-phase lifecycle, tick loop, state machine | UI never starts |
| `SimCanvas.jsx` | Canvas rendering — the visual map | Nothing visible on screen |
| `LeftPanel.jsx` | Sliders, counters, controls | No user interaction |
| `AutomatonPanel.jsx` | Animated state machine diagram | No automaton visualization |
| `EventFeed.jsx` | Live transition log | No signal feed |
| `backend/simulation.py` | NumPy batch simulation engine | Backend API fails |
| `backend/api.py` | FastAPI endpoint `/simulate` | No REST access to backend |

### Main Entry Point
- **Frontend**: `frontend/src/main.jsx` → mounts `App.jsx` → React tree starts
- **Backend**: `uvicorn api:app` → FastAPI starts → `/simulate` endpoint available

### Data Flow
```
User moves slider
       ↓
App.jsx: handleSlider()
       ↓
simRef.current.updateSliders(next)   ← updates Simulation object in memory
       ↓
Next tick: Agent.computeZ(sliders)   ← uses new slider values immediately
       ↓
tick() returns { stats, newEvents, transitionCounts }
       ↓
setStats() → LeftPanel re-renders counters
setEvents() → EventFeed re-renders feed
SimCanvas reads simRef.current.agents directly → canvas redraws
```

---

## 3. Code Explanation — File by File

---

### `Agent.js` — The Individual Person

**What it does:** Models a single migrant. Each `Agent` object stores one person's economic situation, psychology, social connections, and position on the map.

**Key parameters set in constructor:**
- `w_loc` — local (Moldova) wage, normalised: `(280 + random*420)/1000` → range 0.28–0.70
- `w_ext` — external (EU) wage: `(1400 + random*2200)/1000` → range 1.40–3.60
- `cost` — migration cost: 0.18–1.00 (normalised)
- `bias_opt` — optimism: how much the agent *overestimates* EU wages
- `bias_surv` — survivorship bias: hears more success stories than failure stories
- `f_home` — homesickness 0–1 (drives M→R)
- `abroad_adapt` — how well they'd adapt abroad (resists M→R)
- `N_i` — fraction of their network already in state M (diaspora pull) — *written by Simulation each tick*
- `D_i` — fraction of their network in state I (peer contagion) — *written by Simulation each tick*

**`computeZ(sliders)`** — Migration utility score. Returns a single number: positive = wants to leave, negative = wants to stay. Formula:
```
Z = -1.2
  + 2.5 × (w_ext×(1+optimism) - w_loc) × wageGap
  - 1.8 × cost × migrationCost
  + 1.5 × (N_i + D_i) × networkStrength
  + 2.0 × N_i
  + 1.2 × D_i
  + 0.9 × tiktok_influence × tiktokPressure
  + 0.8 × bias_surv
  + lifeCostTerm
```

**`move()`** — Updates position based on current state:
- `S`: Random Brownian drift + soft pull back to home region centroid
- `I`: Directed toward border exit (Prut River for west, Transnistria corridor for east); slows to 18% speed when within 0.32° of the exit — creates visible **border clusters**
- `M`: Light random drift inside EU/Ukraine emigrant zone
- `R`: Walks back to home region; switches to Brownian once within 0.10°

---

### `Simulation.js` — The Engine

**What it does:** Manages all 2,000 agents, runs the tick loop, maintains the social network.

**`spawnBatch(count)`**: Called during the `spawning` phase. Adds 50 agents every 30ms until 2,000 are spawned. When complete, calls `_buildNetwork()`. Returns `true` when done.

**`_buildNetwork()`**: Assigns each agent 3–8 random connections. This is the social network — who knows who.

**`_updateNetworkInfluence()`**: **Critical function.** Before any transitions happen each tick, loops over all agents and computes:
- `N_i = (number of migrated connections) / (total connections)`
- `D_i = (number of intending connections) / (total connections)`

This is called *once before all transitions*, not inside each agent's loop. This prevents cascade effects — if agent A migrates in tick T, agent B won't see that until tick T+1. This is called **synchronous update** and makes the model more realistic.

**`tick()`**: Main loop, called every 180ms:
1. `_updateNetworkInfluence()` — snapshot network
2. For each agent: check state, compute probability, draw random number, maybe transition state
3. For each agent: call `agent.move()`
4. Count states, push to history, return stats

**Transition probabilities:**
```javascript
// S → I
P = sigmoid(Z - threshold * 0.4) * 0.02

// I → M
P = sigmoid(0.3 + 0.8*Z + 0.5*N_i) * 0.05

// M → R
P = sigmoid(-1 + 0.6*f_home - 0.4*abroad_adapt + lifeCostEffect) * 0.008

// R → S
P = 0.01 (constant, slow re-entry)
```

The `* 0.02` and `* 0.05` multipliers keep transitions rare per tick — this creates the smooth, gradual diffusion curves you see in the chart.

---

### `MapData.js` — Moldova Geography

**What it does:** Stores real-world coordinates used by the simulation.

- `WEST_EXIT = { lat: 47.08, lon: 26.80 }` — Prut River crossing (actual Romanian border)
- `EAST_EXIT = { lat: 47.55, lon: 29.65 }` — Transnistrian corridor to Ukraine
- `WEST_ZONE` — where EU migrants are placed (left side of canvas)
- `EAST_ZONE` — where Ukraine migrants are placed (right side)

**`assignMigDir(agent)`**: When an agent forms intent (S→I), this function picks their direction. 87% go west (Romania/EU) based on real Moldovan emigration statistics. Transnistria agents go 55% west (historically stronger Russia/Ukraine ties).

---

### `config.js` — Global Constants

- `REGIONS` — 6 weighted regions: Chișinău (35%), Nord (20%), Sud (15%), Centru (15%), Găgăuzia (8%), Transnistria (7%). Weights match approximate real population distribution.
- `GEO` — Bounding box for the canvas projection: expands west to `24.3°` and east to `31.8°` so external emigrant zones are visible outside Moldova's borders
- `N_AGENTS = 2000` — total agents
- `TICK_MS = 180` — milliseconds per simulation tick
- `SPAWN_BATCH = 50`, `SPAWN_INTERVAL = 30` — 50 agents every 30ms during spawning
- `DEFAULT_SLIDERS` — starting values for all 6 sliders

---

### `App.jsx` — Application Controller

**Three-phase lifecycle:**

```
'intro' (2.8s splash screen)
    ↓ setTimeout
'spawning' (spawnBatch in setInterval every 30ms)
    ↓ spawnBatch returns true
'running' (tick loop in setInterval every 180ms)
```

**Key state:**
- `simRef` — `useRef` holding the `Simulation` instance. `useRef` instead of `useState` so changes don't trigger re-renders; the simulation updates agents internally.
- `stats` — `{ S, I, M, R, tick }` — drives LeftPanel counters
- `events` — last 20 transition events — drives EventFeed
- `transitionRates` — rolling 30-tick average of SI/IM/MR/RS counts — drives AutomatonPanel edge labels

---

### `backend/simulation.py` — NumPy Engine

**Key difference from frontend:** Instead of a `for` loop over JavaScript objects, this uses **NumPy array operations**. Every agent's property is a 1D array of 500 (or N) floats, and operations apply to all agents simultaneously.

```python
w_external_perc = w_external * (1.0 + b_opt)  # all 500 at once

u_mig = (beta_1 * w_external_perc
       - beta_2 * cost
       + beta_3 * network_influence
       ...)  # vector operation

delta_u = u_mig - u_stay

p_s_to_i = logistic(delta_u - theta)  # probability for each agent
```

**Social network** is an `N×N` adjacency matrix. Network influence is computed as a matrix multiply:
```python
weighted_neighbors = weights @ in_i_or_m  # matrix × vector
network_influence = weighted_neighbors / norm_weights
```

This is the NumPy equivalent of looping over each agent's connections.

**Bass diffusion model** — macro reference trajectory:
```python
dm = p*(1 - prev_m) + q*prev_m*(1 - prev_m) - r*prev_m
```
- `p` = innovation coefficient (people who adopt independently)
- `q` = imitation coefficient (people who copy others)
- `r` = return rate

This produces a classic S-curve, used to validate whether the agent-based model produces similar macro-level patterns.

---

### `backend/api.py` — REST API

Single endpoint: `POST /simulate`

- Validates input with Pydantic (`SimulationRequest` with ranges/types)
- Creates a `SimulationConfig` from the request body
- Calls `run_simulation(cfg)` from `simulation.py`
- Returns `{ config, history, macro_diffusion, final_counts, summary }`

CORS is configured to allow only `localhost:5173` (the Vite dev server) for security.

---

### `AutomatonPanel.jsx` — Finite Automaton Diagram

Renders an SVG diagram of the SIMR state machine. States (S, I, M, R) are circles arranged in a diamond. Arrows connect them showing transitions. **Particles** — small colored dots — flow along the arrows every time a real transition happens in the simulation, providing a live visual of the automaton's activity. The particle system uses `requestAnimationFrame` for smooth animation.

---

## 4. Math / Simulation Model

### The Model Family
This is a **compartmental agent-based model** inspired by SIR epidemic models but adapted for migration. The four compartments are:

| State | Meaning | Real-world |
|-------|---------|------------|
| S | Susceptible / Staying | Person in Moldova, not planning to leave |
| I | Intent | Has decided to leave, making preparations |
| M | Migrated | Currently living abroad |
| R | Returned | Came back to Moldova |

### The Core Formula: Migration Utility Z

Z answers: *"How much does this person want to migrate right now?"*

```
Z = -1.2                                           ← base negative bias (migration is hard)
  + 2.5 × (w_ext×(1+δ) - w_loc) × wageGap        ← wage differential (biggest driver)
  - 1.8 × cost × migrationCost                    ← cost of moving
  + 1.5 × (N_i + D_i) × networkStrength           ← social pressure from network
  + 2.0 × N_i                                     ← diaspora pull (migrated friends)
  + 1.2 × D_i                                     ← peer contagion (intending friends)
  + 0.9 × tiktok_influence × tiktokPressure       ← social media signal
  + 0.8 × bias_surv                               ← survivorship bias
  + lifeCostTerm                                  ← cost of living at destination
```

**Why sigmoid?** `sigmoid(Z)` converts Z (which can be any real number) into a probability between 0 and 1. High Z → probability near 1 (almost certain to transition). Low Z → probability near 0 (very unlikely).

### How Each Parameter Affects the Result

| Parameter | Increase effect | Decrease effect |
|-----------|----------------|-----------------|
| `wageGap` | More migration (wage difference matters more) | Less migration |
| `tiktokPressure` | More migration (social media amplified) | Less |
| `migrationCost` | Less migration | More |
| `networkStrength` | Faster diffusion — clusters form sooner | Slower spread |
| `cognitiveBias (δ)` | Agents overestimate EU wages → more migrate | Agents realistic → fewer migrate |
| `lifeCost` | Higher cost at destination → fewer migrate, more return | Cheaper abroad → more stay migrated |

### Assumptions and Limitations

**Assumptions:**
1. Agents make decisions independently each tick (no coordination)
2. The social network is fixed (doesn't change as people leave)
3. Wages and costs are drawn from normal distributions calibrated to Moldova data
4. 87% of migrants go west — based on real emigration statistics
5. Survivorship bias is modeled probabilistically (not from real survey data)

**Limitations:**
1. No seasonal effects (remittances, harvest returns)
2. Social network doesn't evolve as agents migrate
3. No government policy levers (no visa changes, no subsidies)
4. Return migration probability is very low (0.8%/tick) — may be oversimplified
5. Life cost at destination is a fixed constant, not dynamic

### Simple Explanation for Teacher
> "Imagine each agent is a person in Moldova. Every simulation step, they calculate a score — we call it Z. If wages abroad are much higher than at home, Z goes up. If migration is expensive, Z goes down. If their friends are already abroad, Z goes up. If their TikTok feed is full of people living great lives in Italy, Z goes up. When Z crosses a threshold, they form intent to leave. When enough of their friends have already left, they commit and go. A small fraction get homesick and return. The model tracks how many people are in each of these four stages over time."

---

## 5. Teacher Q&A — 40 Questions

### About Specific Files

**Q1: What does `Agent.js` do?**
> It models a single person. Each agent stores their wage, migration cost, psychological traits, social connections, and position on the map. The main method `computeZ()` calculates whether they want to migrate.

**Q2: What is `Simulation.js` responsible for?**
> It orchestrates all 2,000 agents. It builds the social network, runs one tick every 180ms, evaluates all state transitions, updates positions, and returns statistics for the UI.

**Q3: Why does `_updateNetworkInfluence()` run before transitions, not inside each agent's loop?**
> To prevent cascade effects. If it ran inside the loop, agent A migrating in tick T could immediately affect agent B's calculation in the same tick. Running it once before all transitions means everyone uses the previous tick's state — more realistic and consistent.

**Q4: What is `MapData.js` and why does it matter?**
> It stores real geographic coordinates: Moldova's six regions, the two border exit points (Prut River west, Transnistrian corridor east), and the external emigrant zones. Without it, agents have no geography — they can't move toward a real border.

**Q5: What is `config.js`?**
> A single file of global constants: number of agents (2000), tick speed (180ms), region coordinates and population weights, color scheme, and default slider values. Centralizing these means one change updates everything.

**Q6: What does `App.jsx` do?**
> It's the root React component and the application controller. It manages the three-phase lifecycle (intro → spawning → running), runs the tick loop with `setInterval`, holds all shared state (stats, events, sliders), and passes data down to child components.

**Q7: What does `SimCanvas.jsx` render?**
> It renders everything on the HTML Canvas: the Moldova map from real GeoJSON, 2,000 agent dots, network edges between I and M agents, border cluster glows, state transition halos, the orthographic globe, and hover tooltips.

**Q8: What is `AutomatonPanel.jsx`?**
> An SVG finite automaton diagram showing the four states (S, I, M, R) as circles and transitions as arrows. Colored particles flow along the arrows every time a real transition happens, showing the automaton "firing" live.

### About Simulation Logic

**Q9: How does the simulation decide when an agent migrates?**
> It computes Z (migration utility score), passes it through a sigmoid function to get a probability, then draws a random number. If the random number is below the probability, the agent transitions.

**Q10: What is Z?**
> Z is the migration utility score — a single number summarizing how much an agent wants to leave. It combines wage differential, migration cost, social pressure from the network, media influence, and psychological biases.

**Q11: What is N_i and D_i?**
> `N_i` = fraction of an agent's connections who are already Migrated. `D_i` = fraction in Intent state. N_i drives "diaspora pull" — hearing success stories. D_i drives "peer contagion" — others are also considering leaving.

**Q12: What is the sigmoid function and why do you use it?**
> `sigmoid(x) = 1/(1+e^(-x))`. It converts any real number into a probability between 0 and 1. A very positive Z gives probability near 1 (almost certain to migrate). A very negative Z gives probability near 0. It's smooth and differentiable, which is mathematically convenient.

**Q13: Why is the M→R probability so low (0.008)?**
> Because returning is empirically rare and slow. Migrants who left Moldova typically stay abroad for years. Setting the probability at 0.8% per tick makes the model realistic — only a small fraction return each period.

**Q14: What is survivorship bias in this model?**
> People hear mostly success stories from migrants (they post on Facebook, send money home) and rarely hear about failures (who posts that they're miserable abroad?). The `bias_surv` parameter captures this — it shifts Z upward, making agents think migration is more appealing than it statistically is.

**Q15: What is the Bass diffusion model used in the backend?**
> A classic model from marketing for how products spread in a population. It has two parameters: `p` (people who adopt independently) and `q` (people who copy others). Applied here to migration, it produces a macro S-curve that we compare to the agent-based trajectory.

**Q16: Why is there both a frontend and backend simulation?**
> The frontend simulation runs in the browser, visualizes in real time, and is interactive. The backend uses NumPy matrix operations — much faster — for running many simulations with different parameters (parameter sweeps, sensitivity analysis). They implement the same model but serve different purposes.

### About Technology Choices

**Q17: Why React for the frontend?**
> React's component model fits the panel layout (left panel, canvas, right panel are independent components). Its state management (`useState`, `useRef`, `useEffect`) cleanly separates the simulation loop from the UI rendering.

**Q18: Why is the canvas drawn directly instead of using a library like D3?**
> Performance. 2,000 agents moving every 180ms is too heavy for SVG or React DOM updates. A raw HTML Canvas with `requestAnimationFrame` or `setInterval` can redraw everything in milliseconds.

**Q19: Why Python/NumPy for the backend?**
> NumPy's vectorized operations on arrays of 500+ agents are orders of magnitude faster than Python loops. The matrix multiply for social network influence (`weights @ in_i_or_m`) runs in C internally. FastAPI provides a modern, type-safe REST interface.

**Q20: Why FastAPI instead of Flask?**
> FastAPI is async-native, has automatic Pydantic validation (type checking and range checking on all inputs), generates OpenAPI docs automatically, and is significantly faster than Flask. The Pydantic model catches bad inputs before they reach the simulation.

**Q21: Why Vite instead of Create React App?**
> Vite starts in milliseconds (uses native ES modules), has much faster hot module replacement, and produces smaller production bundles. CRA is slower and mostly deprecated.

**Q22: Why `useRef` for the simulation object, not `useState`?**
> `useState` triggers a React re-render every time it changes. The simulation mutates 2,000 agents every 180ms — you don't want that triggering re-renders. `useRef` holds a mutable object that persists across renders without causing them.

### About Data Flow

**Q23: What happens when I move a slider?**
> `handleSlider()` in `App.jsx` is called → it updates the `sliders` state object → calls `simRef.current.updateSliders(next)` → the Simulation stores the new sliders → the next `tick()` call passes these sliders to every agent's `computeZ()` → behavior changes immediately.

**Q24: How does data get from the simulation to the canvas?**
> `SimCanvas.jsx` holds a reference to `simRef` (the Simulation object). Inside its rendering loop, it directly reads `simRef.current.agents` — a JavaScript array. It doesn't wait for React state updates; it reads the simulation's internal state directly on each render frame.

**Q25: How does the EventFeed know about transitions?**
> `Simulation.tick()` returns a `newEvents` array (up to 5 per tick). `App.jsx` collects these with `setEvents(prev => [...prev, ...newEvents].slice(-20))` — keeping only the last 20.

**Q26: How is the sparkline chart generated?**
> `Simulation.history` stores the last 300 ticks of `{ S, I, M, R }` counts. `App.jsx` passes `simRef.current.history` to `LeftPanel`, which passes it to `MiniChart.jsx`. The MiniChart renders an SVG polyline from the history array.

**Q27: How does the automaton panel know transition rates?**
> `App.jsx` maintains a rolling 30-tick circular buffer (`bufferRef`) of `transitionCounts` from each tick. It computes the average `SI`, `IM`, `MR`, `RS` per tick and passes `transitionRates` to `LeftPanel` → `AutomatonPanel`, which labels the arrows.

### About Weaknesses

**Q28: What are the weak points of the project?**
> 1. The frontend and backend are two independent implementations of the same model — they can drift out of sync. 2. The social network is fixed and random; real social networks are more structured (families cluster, diaspora communities exist). 3. No policy levers (visa cost, remittance tax). 4. Return migration is very low and simple.

**Q29: What would you improve next?**
> Add a dynamic network that updates as people migrate (diaspora creates new connections). Add policy sliders (visa cost, language requirement). Connect the frontend visualization to the backend API for rigorous parameter sweeps. Add historical calibration against real Moldova emigration data (2010–2024).

**Q30: What errors can occur in the simulation?**
> Division by zero in `N_i` calculation (guarded with `if (!n) continue`). Agents drifting off the map (GEO bounding box clips them). Float precision issues in very long runs (not significant in practice). If `SPAWN_BATCH` is too large and the browser hangs, the spawning interval can pile up (mitigated by `clearInterval` on completion).

**Q31: How would you scale the project?**
> For the simulation: use Web Workers to run the simulation on a separate thread, preventing UI jank. For the backend: use NumPy/Numba or move to GPU (JAX/CuPy) for very large agent counts. For storage: add a database (PostgreSQL) to save simulation runs. For deployment: containerize with Docker, deploy backend to cloud (AWS/GCP), frontend to CDN.

**Q32: What is the `halo` property on agents?**
> A float from 0 to 1. When an agent transitions states, it's set to 1.0. Every tick it decays by 0.08. The canvas renderer draws a radial glow around agents with halo > 0. This creates a visual "flash" when a transition occurs.

**Q33: How are border clusters formed?**
> When `I`-state agents get within 0.32° of their exit point, `nearBorder` is set to `true` and their speed drops to 18% of normal. They gather at the border, creating a visible cluster. The canvas draws an amber halo around these clusters when ≥4 agents are waiting.

**Q34: Why are region weights set as they are (Chișinău 35%)?**
> These approximate real Moldova population distribution. Chișinău has ~35% of Moldova's urban population. Nord, Sud, Centru each have ~15–20%. Găgăuzia and Transnistria are smaller autonomous regions with different political/cultural ties.

**Q35: What does `placeInExternalZone()` do?**
> When an agent transitions I→M (actually emigrates), it's teleported to the external emigrant zone matching their direction — either `WEST_ZONE` (Romania/EU side) or `EAST_ZONE` (Ukraine/Russia side). Position is randomized within the zone using a disk distribution (`sqrt(random) × spread`) for visual uniformity.

**Q36: Why does the simulation start in 2015?**
> `SIM_START_YEAR = 2015` in config. The footer shows `2015 + Math.floor(tick / 12)` — treating 12 ticks as one year. 2015 is approximately when Moldova's visa-free EU access (2014 agreement) began accelerating westward migration.

**Q37: What is the `lifeCost` slider?**
> Life cost at destination (cost of living, based on Numbeo index). Romania is 0.68 (normalized), Ukraine 0.57. A high `lifeCost` multiplier makes the destination more expensive, reducing Z and increasing return probability. This adds nuance — migrating to an expensive country reduces the economic gain.

**Q38: How does the `getChannel()` function work?**
> It categorizes what drove a migration decision for display in the EventFeed. Priority: if `N_i > 0.30` (strong diaspora pull) → `'family'`; else if `tiktok_influence > 0.30` → `'tiktok'`; else if `fb_influence > 0.15` → `'facebook'`; else → `'wage'`. This determines the icon shown (👨‍👩‍👧, 🎵, 📘, 💰).

**Q39: What is the SIMR model inspired by?**
> The classic SIR epidemic model from mathematical epidemiology (Kermack-McKendrick, 1927). SIR tracks Susceptible → Infected → Recovered. We adapted it: Susceptible (Staying) → Infected (Intent) → Migrated → Returned. Migration spreads through social networks like a contagion.

**Q40: How are the agent dots drawn on the canvas?**
> `SimCanvas.jsx` reads `simRef.current.agents` inside a rendering loop. For each agent, it converts `(lat, lon)` to canvas pixels using a linear projection based on the `GEO` bounding box, then draws a circle with `ctx.arc()`. Color is `COLORS[agent.state]`. Agents with `halo > 0` get an additional `ctx.createRadialGradient()` drawn beneath them.

---

## 6. Random Code Defense Mode

### Snippet 1: sigmoid + transition probability
```javascript
const sigmoid = x => 1 / (1 + Math.exp(-x));

// S → I transition
if (Math.random() < sigmoid(Z - agent.threshold * 0.4) * 0.02) {
  agent.state = 'I';
```

**What it does:** Converts Z-score into a probability, draws a random number, and fires the S→I transition if the draw wins.

**Line by line:**
- `sigmoid(Z - agent.threshold * 0.4)` → normalize Z relative to the agent's personal threshold (some people need higher motivation to form intent)
- `* 0.02` → cap the maximum probability at 2% per tick (keeps diffusion slow and realistic)
- `Math.random() < P` → standard Bernoulli trial — the whole system is probabilistic, not deterministic

**How to explain orally:** *"The sigmoid converts the Z-score into a probability between 0 and 1. The 0.02 multiplier ensures that even if Z is very high, only 2% of agents with that score will transition in a single tick. That's what creates the gradual diffusion curve rather than a sudden jump."*

**Follow-up Q:** "Why 0.02 and not 0.1?" → At 0.1, with 2000 agents and Z near positive values, hundreds would migrate in the first few ticks — the simulation would saturate immediately. 0.02 is calibrated so the simulation runs for meaningful time.

---

### Snippet 2: Network influence computation
```javascript
_updateNetworkInfluence() {
  for (const a of this.agents) {
    const n = a.connections.length;
    if (!n) { a.N_i = 0; a.D_i = 0; continue; }
    let migrated = 0, intending = 0;
    for (const idx of a.connections) {
      const c = this.agents[idx];
      if (!c) continue;
      if (c.state === 'M')      migrated++;
      else if (c.state === 'I') intending++;
    }
    a.N_i = migrated / n;
    a.D_i = intending / n;
  }
}
```

**What it does:** Computes the fraction of each agent's social connections who are migrated (N_i) or intending (D_i), and writes these directly onto each agent object.

**Why it's called before the tick loop:** If we computed N_i *inside* the transition loop, agent A migrating early in the loop would immediately change N_i for agent B later in the same loop. By snapshotting first, all agents use the same social picture from the previous tick.

**Follow-up Q:** "What if an agent has no connections?" → Guarded: `if (!n) { a.N_i = 0; a.D_i = 0; continue; }`. Division by zero is prevented explicitly.

---

### Snippet 3: Bass diffusion (backend)
```python
dm = p * (1 - prev_m) + q * prev_m * (1 - prev_m) - cfg.r * prev_m
macro_m.append(float(np.clip(prev_m + dm, 0.0, 1.0)))
```

**What it does:** Computes one step of the Bass diffusion model — a macro-level S-curve of migration share.

**Line by line:**
- `p * (1 - prev_m)` → innovators: people who migrate independently (fraction p of those not yet migrated)
- `q * prev_m * (1 - prev_m)` → imitators: people who copy those already migrated (proportional to both `prev_m` and those remaining)
- `- cfg.r * prev_m` → return: some fraction of migrants come back
- `np.clip(..., 0.0, 1.0)` → keeps the value a valid fraction (0–100%)

**Oral explanation:** *"This is the classic Bass diffusion equation — the same math used to model how iPhones spread through a population. P represents people who adopt a behavior independently, Q represents people who copy others. The interaction term `q × m × (1-m)` is highest when half the population has migrated — that's where social copying is strongest. We use this as a macro-level sanity check against our agent-based results."*

---

### Snippet 4: Agent region assignment
```javascript
let cum = 0;
const r = Math.random();
this.region = REGIONS[REGIONS.length - 1];
for (const region of REGIONS) {
  cum += region.weight;
  if (r <= cum) { this.region = region; break; }
}
```

**What it does:** Weighted random assignment of an agent to one of Moldova's six regions.

**How:** Walks through regions accumulating weights (0.35, 0.55, 0.70, 0.85, 0.93, 1.00). Stops when cumulative weight exceeds the random draw. This ensures Chișinău gets 35% of agents, Nord gets 20%, etc.

---

### Snippet 5: Brownian + home pull (S-state movement)
```javascript
_moveS() {
  this.vLat += (Math.random() - 0.5) * SPEED_BROWNIAN;
  this.vLon += (Math.random() - 0.5) * SPEED_BROWNIAN;
  this.vLat *= DAMPING;
  this.vLon *= DAMPING;
  this.vLat += (this.region.lat - this.lat) * HOME_PULL;
  this.vLon += (this.region.lon - this.lon) * HOME_PULL;
}
```

**What it does:** Random walking with a gentle gravitational pull back to home. Prevents agents from drifting off-region while still looking organic.

**Oral:** *"Staying agents wander randomly — that's the Brownian noise. But they're also slightly pulled toward their home region centroid, like a spring. The damping factor of 0.9 smooths the motion — without it, agents would vibrate jerkily."*

---

## 7. Presentation Scripts

### 2-Minute Script
> "Good [morning/afternoon]. Our project is called the Economic Migration Simulation for Moldova.
>
> Moldova has one of the highest emigration rates in Europe. We asked: what drives this, and can we model it mathematically?
>
> We built an agent-based model. That means we simulated 2,000 individual people — each with their own wage, psychology, and social connections. Every person calculates a score we call Z: how much they want to migrate. If wages abroad are much higher, Z goes up. If their friends are already abroad, Z goes up. If TikTok is full of success stories, Z goes up.
>
> When Z exceeds their personal threshold, they form intent to leave. When enough of their social network has gone, they commit and migrate. Some return when homesickness outweighs the economic gain.
>
> The visualization you see is a live simulation: 2,000 agents on a real Moldova map, clustering at the Romanian border, crossing into the EU, some returning home. You can adjust sliders in real time and watch migration patterns change immediately.
>
> The model is inspired by epidemic diffusion theory — migration spreads through social networks the same way a virus spreads through a population."

### 5-Minute Script
> (Start with the 2-minute script, then continue:)
>
> "Let me walk you through the architecture. There are two engines.
>
> The frontend engine runs entirely in the browser — JavaScript, React, HTML Canvas. Each agent is a JavaScript object. Every 180 milliseconds, a tick runs: we first snapshot the social network to see who's migrated among each person's connections — that's the diaspora pull. Then for every agent we compute Z and draw a random number. If the draw beats the probability, the agent changes state.
>
> The backend is Python with NumPy and FastAPI. Instead of JavaScript objects, we use arrays: all 500 agents' wages are one NumPy array, all costs are another array. The social network is a 500×500 matrix, and network influence is computed in one matrix multiply. This is much faster for running many simulations to explore how parameters affect migration patterns.
>
> The backend also runs the Bass diffusion model — a classic equation from marketing research for how innovations spread through populations — as a macro-level comparison to validate our agent-based results.
>
> The geography is calibrated to real Moldova. Chișinău has 35% of agents, matching its share of Moldova's population. 87% of migrants go west, toward Romania and the EU — the real statistic. Agents cluster at the Prut River crossing — the actual border — before teleporting to the EU emigrant zone.
>
> On the right side you see the Signal Feed — every state transition tagged with what caused it: family connection, TikTok, Facebook, or pure wage gap. The finite automaton diagram in the bottom left shows the state machine live, with particles flowing along arrows as transitions fire.
>
> The key insight the model produces: network effects dominate. Even moderate wage gaps produce rapid cascades of migration once a critical fraction of the network has left. That matches real observations from Moldova's emigration wave after 2014's EU visa-free agreement."

### Technical Explanation Script
> "The core of the model is a utility function Z computed per agent per tick. Z aggregates wage differential — normalized to a 0–1 scale — migration cost, social network influence (N_i for diaspora pull, D_i for peer contagion), media influence, and psychological biases. We pass Z through a sigmoid to get a probability, then run a Bernoulli trial.
>
> State transitions are: S→I with max probability 2% per tick, I→M with max 5%, M→R with max 0.8%, R→S with fixed 1%. The low probabilities keep the diffusion gradual.
>
> Network influence is computed synchronously before the tick loop — everyone uses last tick's state — to prevent within-tick cascade effects. This is analogous to synchronous update in cellular automata.
>
> Geographically, agents use a linear equirectangular projection from decimal degrees to canvas pixels. Movement physics uses velocity with damping: S-state agents have Brownian motion plus a spring force toward their home region. I-state agents have directed drift toward the real Prut River coordinates, slowing to 18% speed near the border. This creates the visual border clustering effect."

### Non-Technical Explanation Script
> "Imagine you have 2,000 small people living in a Moldova made of pixels. Each person has a job, a salary, and friends. Once in a while, each person asks themselves: 'Should I leave?' If my friends abroad are sending photos from Italy and my salary here is €300 while they're making €1,500 there, I might start thinking about it.
>
> If I think about it long enough, and enough of my friends go, I'll eventually leave. Some people come back because they miss home. You can control how expensive migration is, how much TikTok matters, how big the wage gap is — and watch whether that changes how many people leave and how fast."

### Closing Statement
> "What we built is more than a visualization. It's a tool for testing hypotheses about migration policy. Want to know what happens if Moldova raises wages by 20%? Move the wage gap slider. Want to see the effect of social media campaigns? Adjust TikTok pressure. The model makes causal mechanisms visible. Our next step would be calibrating it against real Moldova emigration data from 2014 to 2024 to validate the parameters."

---

## 8. Weaknesses and Honest Improvements

### Strong Points
- Clean separation of simulation logic from UI (Agent.js and Simulation.js are pure logic)
- Synchronous network update prevents cascade artifacts — a real modeling decision
- Real geographic coordinates calibrated to Moldova
- Both a fast NumPy backend and a visual browser frontend
- Finite automaton visualization is genuinely novel for this type of presentation
- Slider interaction is immediate — very good for demos

### Likely Criticisms and Professional Responses

**"Your social network is completely random."**
> "That's correct. A random Erdős–Rényi graph is the simplest defensible choice and is standard in introductory agent-based models. A realistic improvement would use a preferential attachment graph (scale-free network) to model family clusters and diaspora communities. We chose random connectivity to focus on the economic and psychological parameters."

**"How did you validate the model against real data?"**
> "We calibrated the parameters against real Moldova statistics: wage distributions from Moldova's National Bureau of Statistics (local mean ~700 MDL, EU mean ~1900 EUR), 87% westward migration from Moldovan emigration surveys, and Chișinău's ~35% population share. The Bass diffusion model provides a macro-level sanity check. Full validation against time-series data (e.g., World Bank emigration statistics 2014–2024) is planned as the next step."

**"The return rate seems too low."**
> "0.8% per tick translates to roughly 10% annual return probability if we assume ~12 ticks per year. That's actually consistent with long-term Moldovan return rates. It is simplified — in reality, return probability spikes in specific years (family illness, economic crisis at destination, COVID) — but the constant rate is a reasonable first-order approximation."

**"You have two simulation engines that could drift."**
> "Yes, maintaining two implementations is technical debt. The ideal architecture would have a single simulation engine (likely the Python backend) and the frontend would visualize results via the API rather than running its own engine. The current split prioritizes real-time responsiveness (browser engine) and rigorous analysis (Python engine)."

### Technical Debt
1. Frontend and backend implement the same model independently — can diverge
2. Social network is random (not scale-free or family-structured)
3. No unit tests for simulation logic
4. SimCanvas reads the simulation object directly (bypasses React data flow)
5. `lifeCost` is a fixed constant per direction, not dynamic

---

## 9. Final Study Sheet

### Main Idea
Agent-based SIMR model of economic migration in Moldova. 2,000 virtual people with wages, psychology, and social networks. Each tick they compute a utility score Z and probabilistically change state: Staying → Intent → Migrated → Returned.

### Technologies

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite | Component model, fast dev |
| Visualization | HTML Canvas | Performance with 2,000 agents |
| Simulation (browser) | Plain JavaScript classes | Fast, no dependencies |
| Backend | Python + NumPy | Vectorized matrix operations |
| API | FastAPI + Pydantic | Auto-validation, typed |

### Main Files
- `Agent.js` — individual person, Z formula, movement physics
- `Simulation.js` — tick loop, social network, orchestration
- `MapData.js` — Moldova geography, border exits
- `config.js` — all global constants
- `App.jsx` — lifecycle, tick loop, state machine
- `SimCanvas.jsx` — canvas rendering
- `backend/simulation.py` — NumPy engine
- `backend/api.py` — REST endpoint

### Main Functions
- `Agent.computeZ(sliders)` — migration utility score
- `Simulation.tick()` — one simulation step
- `Simulation._updateNetworkInfluence()` — social network snapshot
- `Simulation._buildNetwork()` — random adjacency lists
- `Agent.move()` — position physics
- `run_simulation(cfg)` — full backend simulation
- `assignMigDir(agent)` — west vs east migration direction

### Model Logic (5 lines)
1. Z = wage_advantage - cost + social_pressure + media + biases
2. S→I: sigmoid(Z) × 2% per tick
3. I→M: sigmoid(0.3 + 0.8Z + 0.5×N_i) × 5% per tick
4. M→R: sigmoid(−1 + 0.6×homesickness − 0.4×adaptation) × 0.8% per tick
5. R→S: 1% per tick (flat)

### 10 Key Phrases to Remember
1. *"SIMR stands for Staying, Intent, Migrated, Returned — a compartmental model borrowed from epidemiology."*
2. *"Z is the migration utility score — one number summarizing whether this agent wants to leave."*
3. *"N_i is diaspora pull; D_i is peer contagion — both drive faster cascade migration."*
4. *"We update network influence before the tick loop to prevent within-tick cascade effects."*
5. *"87% of agents migrate west — matching real Moldova emigration statistics."*
6. *"The sigmoid converts Z into a probability between 0 and 1."*
7. *"The backend uses NumPy matrix operations for speed; the frontend runs agent-by-agent for real-time visualization."*
8. *"Border clusters form because I-state agents slow to 18% speed within 0.32 degrees of the exit."*
9. *"The Bass diffusion model provides a macro-level S-curve as a validation reference for the agent-based results."*
10. *"Sliders change parameters in real time because `updateSliders()` is called immediately on each slider change, and the next tick uses the new values."*

### Emergency Answers (If You Forget Something)

| Question | Emergency Answer |
|----------|-----------------|
| "How does the simulation work?" | "Each agent computes a score Z based on wages, social network, and biases. We convert Z to a probability and flip a weighted coin to decide if they migrate." |
| "What is Z?" | "Z is the migration utility — a score that's high when wages abroad are much better, when friends have already left, or when social media pushes migration." |
| "What is SIMR?" | "Four states modeled after epidemic models: Staying, Intent, Migrated, Returned." |
| "Why do you use sigmoid?" | "It maps any number to a probability between 0 and 1. High Z → high probability, low Z → low probability, smoothly." |
| "What does the backend do differently?" | "It uses NumPy array operations instead of agent-by-agent loops, so it's much faster. It also computes the Bass diffusion reference curve." |
| "What would you improve?" | "A realistic social network (not random), calibration against real Moldova migration data, and connecting the frontend to the Python backend instead of maintaining two engines." |
