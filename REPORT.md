# Economic Migration Simulation Platform
### A Web-Based Agent Model for Analyzing and Predicting Migration Dynamics in the Republic of Moldova

**Document type:** Technical & Strategic Report
**Audience:** Academic evaluators, policy stakeholders, investors, technical reviewers
**Date:** 2026-04-28
**Repository:** `Economic-Migration-Simulation`

---

## 1. Introduction

### 1.1 Problem Statement
Economic migration is one of the most consequential socio-economic phenomena of the 21st century. For small open economies — Moldova being a paradigmatic case — outward migration reshapes labor markets, distorts demographic pyramids, accelerates depopulation in rural regions, and creates structural dependence on remittances. Yet decision-makers continue to rely on retrospective statistics that arrive 12–36 months late and on macro-models that smooth away the *behavioral* layer where migration decisions are actually made.

A migration decision is not a smooth aggregate function. It is a discrete, individual-level commitment shaped by:
- a wage differential between origin and destination,
- a one-time monetary and psychological cost,
- network signals from peers and diaspora,
- biased perceptions of success amplified by social media.

Capturing this requires an **agent-based** approach — one where the model is a *population of decision-makers*, not a system of differential equations.

### 1.2 Context
- **Global**: The IOM estimates 281 million international migrants worldwide. Network effects and platform-mediated information (TikTok, Facebook diasporic groups) increasingly dominate classical economic push/pull factors.
- **Local (Moldova)**: Estimates suggest 25–35% of the working-age population resides abroad. The country exhibits two opposite outflow corridors — westward (EU/Romania) and eastward (Ukraine/CIS, declining post-2022) — each with its own driver structure.
- **Methodological gap**: Existing tools either *simulate macro flows* (Bass-style diffusion, gravity models) without micro-foundations, or *survey individuals* without dynamic feedback. Few solutions integrate both.

### 1.3 Objectives
1. Build a transparent, reproducible **agent-based simulator** of migration dynamics specialized for Moldova but generalizable.
2. Expose the model through a **real-time interactive web application** so non-technical users can run scenarios.
3. Provide a **comparison layer** between micro-emergent dynamics and a classical macro reference (Bass diffusion).
4. Produce a tool useful for **academia** (research), **policy** (counterfactual analysis), and **education** (intuition-building).

---

## 2. Problem Analysis

### 2.1 Current Challenges
| Challenge | Description |
|---|---|
| **Data latency** | Official census/labor data arrive with 1–3 year delay. |
| **Aggregation loss** | Macro models hide heterogeneity (region, age, network). |
| **Behavioral opacity** | Standard regressions cannot represent peer contagion or survivorship bias. |
| **Lack of counterfactuals** | Policymakers cannot ask "what if wages rose 10%?" against an empirical baseline. |
| **Low accessibility** | Modeling tools (NetLogo, R, Python) are not usable by non-coders. |

### 2.2 Limitations of Existing Solutions
- **Gravity models** (Tinbergen-style): regress flows on GDP, distance, population — accurate at steady state, blind to dynamics, biases, network structure.
- **Bass diffusion**: captures S-curve dynamics but treats the population as homogeneous.
- **Markov chain models**: support state transitions but lack spatial and social-network dimensions.
- **Pure ML (XGBoost, LSTM)**: predictive but non-explanatory; cannot answer policy "why" questions.
- **Existing ABM frameworks** (NetLogo, Mesa): research-grade but not deployable as web services for stakeholders.

### 2.3 Target Users & Needs
| User | Needs |
|---|---|
| **Researchers / Economists** | Reproducible parameterized simulations, exportable trajectories, comparison with macro references. |
| **Policymakers / Government** | Scenario sliders (raise wages? subsidize return?), readable visualizations, regional breakdown. |
| **Students / Educators** | Intuitive UI, visible state machine, real-time feedback to slider changes. |
| **NGOs / Diaspora orgs** | Understanding diaspora pull effects, return-migration triggers. |
| **Investors / Strategists** | Demographic risk modeling for long-term planning. |

---

## 3. Solution Overview

### 3.1 High-Level Description
A two-tier web platform consisting of:
- A **JavaScript canvas simulator** running entirely in the browser, providing real-time animation of ~2,000 agents over a stylized Moldovan map.
- A **Python/NumPy/FastAPI backend** for rigorous parameter sweeps, larger populations, and comparison with a Bass-diffusion macro reference.

Both engines implement the same conceptual model — the **S/I/M/R agent state machine** — but serve complementary purposes (interactive exploration vs. quantitative research).

### 3.2 Core Functionalities
- Real-time animated simulation with up to 2,000 agents.
- Five live policy sliders (wage gap, migration cost, network strength, TikTok pressure, cognitive bias).
- Live signal feed showing per-agent state transitions with channel attribution.
- Sparkline + counter dashboard of S, I, M, R fractions.
- Backend API for batch experiments returning full trajectories and macro diffusion comparison.
- Geographic visualization with two border corridors (West/Romania, East/Ukraine), waiting clusters, and regional centroids.

### 3.3 Unique Value Proposition
1. **Micro + macro coexistence**: only platform exposing both an agent-based emergent trajectory and a macro Bass reference on the same axis.
2. **Behavioral fidelity**: explicit modeling of optimism, survivorship, and peer/diaspora contagion.
3. **Web-native**: no installation, no CLI; full simulation runs client-side at 60 fps.
4. **Country-specialized geography**: Moldova-specific regions, border physics, and west/east corridor allocation calibrated on empirical priors.

---

## 4. System Architecture

### 4.1 Component Overview
```
┌─────────────────────────────────────────────────────────────┐
│                       Web Browser                           │
│                                                             │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │ React UI     │  │ Simulation.js  │  │  SimCanvas     │   │
│  │ (App, Panels)│←→│ (orchestrator) │→ │  (renderer)    │   │
│  └──────┬───────┘  └────────┬───────┘  └────────────────┘   │
│         │                   │                               │
│         │                   ▼                               │
│         │           ┌────────────────┐                      │
│         │           │  Agent class   │                      │
│         │           │  (per-agent    │                      │
│         │           │   state)       │                      │
│         │           └────────────────┘                      │
└─────────┼───────────────────────────────────────────────────┘
          │  (optional)  HTTPS + JSON
          ▼
┌─────────────────────────────────────────────────────────────┐
│            Python Backend (FastAPI / Uvicorn)               │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │ api.py       │ →  │ simulation.py (NumPy engine)     │   │
│  │ POST /simulate│   │  - SimulationConfig dataclass    │   │
│  │ Pydantic     │    │  - vectorized agent ops          │   │
│  │ validation   │    │  - macro Bass reference m(t)     │   │
│  └──────────────┘    └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Frontend
- **Framework**: React 18 with Vite build tooling.
- **Rendering**: HTML5 Canvas 2D, manually orchestrated for performance (no SVG per-agent).
- **Module map**:
  - `src/App.jsx` — three-phase lifecycle (`intro` → `spawning` → `running`).
  - `src/components/SimCanvas.jsx` — orthographic globe inset, equirectangular Moldova map, agent dots, halos, network edges, border-cluster glow, hover tooltip.
  - `src/components/LeftPanel.jsx` — animated state counters + 5 sliders.
  - `src/components/EventFeed.jsx` — last 20 transition events with channel icons and Z-scores.
  - `src/components/MiniChart.jsx` — SVG sparkline (last 60 ticks).
  - `src/simulation/Agent.js` — agent class.
  - `src/simulation/Simulation.js` — orchestrator (`tick`, `_buildNetwork`, `_updateNetworkInfluence`).
  - `src/simulation/MapData.js` — regions, centroids, border exits, west/east allocation.

### 4.3 Backend
- **Framework**: FastAPI on Uvicorn.
- **Endpoint**: `POST /simulate`.
- **Validation**: Pydantic `SimulationRequest` (16+ parameters, range-checked).
- **Core engine**: `simulation.py` — `SimulationConfig` dataclass + vectorized NumPy loop.
- **Network**: weighted adjacency built from three tie types (relatives, Facebook, TikTok), each contributing different weights.
- **Macro reference**: every run also produces a Bass-diffusion trajectory `m(t)` for direct comparison with the emergent micro fraction.
- **CORS**: configured for `localhost:5173` (frontend dev).

### 4.4 Database Design
The current architecture is **stateless** by design — every simulation is reproducible from `(config, seed)`. No persistent DB is required for the core simulator. For deployment-grade extensions, the recommended schema is:

| Table | Purpose | Key fields |
|---|---|---|
| `runs` | Stores each simulation execution | `run_id`, `seed`, `created_at`, `user_id`, `config_json` |
| `trajectories` | Per-tick aggregate counts | `run_id`, `tick`, `s`, `i`, `m`, `r`, `macro_m` |
| `events` | Individual state transitions | `run_id`, `tick`, `agent_id`, `from_state`, `to_state`, `z_score`, `channel` |
| `users` | Auth and quota (institutional tier) | `user_id`, `email`, `org`, `plan` |
| `scenarios` | Saved slider presets | `scenario_id`, `name`, `params_json`, `owner` |

PostgreSQL is the recommended target (JSONB + good time-series performance with proper indexing).

### 4.5 Data Flow Diagram (textual)
```
[User slider input]
        │
        ▼
[App.jsx React state] ──► [Simulation.tick()] ──► [Agent.computeZ()]
        │                          │                       │
        │                          ▼                       ▼
        │                  [_updateNetworkInfluence]  [Z-score → P(transition)]
        │                          │                       │
        │                          ▼                       ▼
        │                  [N_i, D_i per agent]      [state transition + halo flash]
        │                          │                       │
        ▼                          ▼                       ▼
[LeftPanel counters]         [SimCanvas.draw()]      [EventFeed push]
[MiniChart sparkline]
```
The same conceptual flow applies to the backend, except the loop is fully vectorized in NumPy and the result is serialized as JSON.

---

## 5. Mathematical Model

### 5.1 Agent State Machine
Each agent occupies one of four mutually exclusive states:

- **S** — Susceptible / Staying
- **I** — Intent to migrate
- **M** — Migrated
- **R** — Returned

Allowed transitions: `S → I → M → R → S`. The closure to `S` permits long-term equilibrium analysis.

### 5.2 Migration Utility Score (Z)
The Migration Utility Score ($Z$) is the core behavioral metric calculating an individual's net propensity to migrate. Instead of relying purely on classical push-pull economic theory, this metric is constructed as an additive linear combination of economic friction, social contagion, and psychological biases. It quantifies the bounded rationality of agents, explicitly separating the 'diaspora pull' (migrated friends signaling success) from 'peer contagion' (friends intending to leave, providing local social proof).

For agent *i* at tick *t*, the score is computed as follows (see `computeZ()` in `Agent.js`):

$$
Z_i = -1.2
+ 2.5 \cdot (w^{ext}_i (1 + \delta_{eff}) - w^{loc}_i) \cdot s_{wage}
- 1.8 \cdot c_i \cdot s_{cost}
+ 1.5 \cdot (N_i + D_i) \cdot s_{net}
+ 2.0 \cdot N_i
+ 1.2 \cdot D_i
+ 0.9 \cdot \tau_{eff}
+ 0.8 \cdot b^{surv}_i
- 1.8 \cdot (l^{target}_i \cdot s_{life} - 0.60)
$$

| Symbol | Meaning |
|---|---|
| $w^{ext}_i$, $w^{loc}_i$ | Perceived external and local wages (normalized 0–4) |
| $\delta_{eff}$ | Effective optimism bias ($\delta_i \cdot s_{cog\_bias}$) |
| $c_i$ | Migration cost (normalized) |
| $N_i$ | Fraction of agent *i*'s network currently in state M (diaspora pull) |
| $D_i$ | Fraction in state I (peer contagion) |
| $\tau_{eff}$ | Effective TikTok influence ($\tau_i \cdot s_{tt}$) |
| $b^{surv}_i$ | Survivorship bias term |
| $l^{target}_i$ | Cost of living at the target destination ($0.62$ default for Moldova baseline) |
| $s_{wage}, s_{cost}, s_{net}, s_{tt}, s_{cog\_bias}, s_{life}$ | User-controlled slider multipliers |

To deeply understand the structural mechanics of the utility score, it is helpful to group its mathematical terms into four intuitive conceptual buckets:

1. **Economic Rationality:** The term $2.5 \cdot (w^{ext}_i (1 + \delta_{eff}) - w^{loc}_i)$ calculates the anticipated financial gain of moving. It directly compares local wages with external wages. Crucially, it models *perceived* external wages, which are inflated by optimism and cognitive biases ($\delta_{eff}$), meaning agents often decide to move based on flawed, overly optimistic financial expectations.
2. **Friction and Inertia:** The universal anchor constant ($-1.2$) establishes a baseline resistance, representing the profound psychological and emotional friction required to uproot one's life. This baseline is compounded by the specific migration cost penalty $-1.8 \cdot c_i \cdot s_{cost}$, simulating concrete logistical hurdles like travel expenses, visas, and relocation logistics.
3. **Social Proof & Network Effects:** The model takes a nuanced approach by separating two distinct social phenomena. The $2.0 \cdot N_i$ multiplier captures "Diaspora Pull"—the powerful, tangible draw of friends and family who have successfully navigated the system and settled abroad. Conversely, $1.2 \cdot D_i$ accounts for "Peer Contagion"—the localized, somewhat ephemeral influence of neighbors who are merely *intending* or preparing to leave, supplying local social proof.
4. **Digital and Media Interference:** Modern migration is heavily mediated by algorithms. The $0.8 \cdot b^{surv}_i$ (survivorship bias) and $0.9 \cdot \tau_{eff}$ (TikTok / Facebook influence) terms bypass traditional geographic networks entirely. They artificially accelerate the migration appetite by bombarding the agent with carefully curated success stories, entirely decoupled from objective macroeconomic realities.

*Code Example (`Agent.js`):* The formula evaluates the economic utility against the actual cost of living. The life cost term penalizes the utility score when the destination's cost of living (adjusted dynamically by the interactive slider) exceeds the 0.60 baseline. Overestimating foreign wages through the `cognitiveBias` multiplier simulates unrealistic expectations fostered by social media.
```javascript
const delta           = this.bias_opt * sliders.cognitiveBias;
const w_ext_adj       = this.w_ext * (1 + delta);
const TT_i            = this.tiktok_influence * sliders.tiktokPressure;
const social_pressure = (this.N_i + this.D_i) * sliders.networkStrength;
const targetLifeCost  = this.targetLifeCost ?? 0.62;
const lifeCostFactor  = targetLifeCost * sliders.lifeCost;
const lifeCostTerm    = -1.8 * (lifeCostFactor - 0.60);
```

The constant $-1.2$ serves as a friction baseline, reflecting the intrinsic inertia of a population and the real-world friction of disrupting one's life even when economic incentives appear favorable on paper.

### 5.3 Transition Probabilities
Logistic functions (represented by $\sigma$) translate the unbounded utility score $Z$ into normalized per-tick transition probabilities (see `Simulation.js`). Using logistic functions prevents immediate phase changes, accurately simulating the hesitation and friction observed in individual decision-making processes.

Because agents process their choices asynchronously, these transition rates function as individual dice rolls mapping the conceptual 'intent' of an agent to a discrete physical move:

- **S $\to$ I (Formation of Intent):** This represents the psychological shift towards migration. The process is a slow diffusion with a strict threshold penalty ($\theta_i$), governed by a base conversion rate of 0.02.
- **I $\to$ M (Actual Migration):** The behavioral leap to emigrate relies heavily on logistical assurance. The catalyst here is $0.5 N_i$; having friends already settled abroad significantly bolsters the transition probability, translating intent into an actual border crossing.
- **M $\to$ R (Return Migration):** Return decisions are primarily driven by emotional factors ($f^{home}_i$ vs. $a^{adapt}_i$) and economic strain, scaling slowly on a base multiplier of 0.008.

In algorithmic terms, this transitions the deterministic utility score $Z_i$ into a stochastic Monte Carlo process. During every simulation tick, each agent effectively flips a dynamically weighted coin. The weighting of this coin is computed by sliding the utility score $Z_i$ through a corresponding logistic (sigmoid) curve, bounded structurally by a transition-specific base rate (e.g., $0.05$ for $I \to M$). This critical mechanic operates under the surface to ensure that even agents with overwhelmingly positive migration scores do not "teleport" instantly across mathematical states. Instead, they exhibit realistic human hesitation—gathering resources, weighing emotional ties, and resolving logistical friction—ensuring intent gradually translates into verifiable action, creating emergent socio-economic ripples.

$$
P(S \to I) = \sigma(Z_i - 0.4 \cdot \theta_i) \cdot 0.02
$$

$$
P(I \to M) = \sigma(0.3 + 0.8 Z_i + 0.5 N_i) \cdot 0.05
$$

$$
P(M \to R) = \sigma(-1 + 0.6 f^{home}_i - 0.4 a^{adapt}_i + 0.32(l^{target}_i \cdot s_{life} - 0.62)) \cdot 0.008
$$

$$
P(R \to S) = 0.01
$$

with $\sigma(x) = 1/(1 + e^{-x})$, $\theta_i$ = personal threshold, $f^{home}_i$ = attachment to home, $a^{adapt}_i$ = ability to adapt abroad, and $0.32(l^{target}_i \cdot s_{life} - 0.62)$ modeling the effect of living costs accelerating or hindering return.

*Code Example (`Simulation.js`):* The snippet below demonstrates how the return probability dynamically responds to destination living costs. When the `lifeCost` scales too high relative to expectations, homesickness becomes an economic necessity, pushing migrated users back to region 'R'.
```javascript
const lifeCostEffect = 0.32 * ((agent.targetLifeCost ?? 0.62) * this.sliders.lifeCost - 0.62);
if (Math.random() < sigmoid(-1 + 0.6 * agent.f_home - 0.4 * agent.abroad_adapt + lifeCostEffect) * 0.008) {
  agent.state = 'R';
  // ...
}
```

The multiplicative *base rates* (0.02, 0.05, 0.008, 0.01) are calibrated so simulated diffusion timescales match observed demographic data, condensing years of macroeconomic trends into a few hundred visualization ticks.

### 5.4 Macro Reference (Bass Diffusion)
For comparison, the backend computes a closed-form macro trajectory:

$$
\frac{dm}{dt} = (p + q \cdot m) \cdot (1 - m)
$$

with innovation coefficient *p*, imitation coefficient *q*, and cumulative migrated share *m(t)*. This is the homogeneous-population approximation; deviations between $m(t)$ and the agent-based fraction reveal how heterogeneity and network structure alter diffusion.

### 5.5 Assumptions (explicit)
1. Agents are bounded-rational: they evaluate Z, not full optimization.
2. The social network is static within a run (built once at spawn).
3. Border crossing is binary (no partial migration).
4. Wages are exogenous and constant within a run.
5. R-state agents are eligible to re-enter the cycle (`R → S`).
6. Geographic positions are stylized and do not represent actual residence.

### 5.6 From Input to Prediction
```
Sliders + seed
   ↓
SimulationConfig (immutable per run)
   ↓
Agent population (heterogeneous attributes)
   ↓
Network construction (3 tie types, weighted)
   ↓
For each tick t:
   1. compute N_i, D_i from state snapshot at t-1
   2. compute Z_i for each agent
   3. apply σ() to derive transition probabilities
   4. draw Bernoulli outcomes
   5. update positions (move())
   6. emit events to EventFeed
   ↓
Output: trajectory history, final counts, macro reference, summary stats
```

---

## 6. Algorithm & Logic

### 6.1 Per-Tick Pipeline (pseudocode)
```
function tick(simulation):
    // Step 1 — freeze a network snapshot to prevent cascade effects
    for each agent in simulation.agents:
        agent.N = fraction_of_neighbors_in_state(agent, "M")
        agent.D = fraction_of_neighbors_in_state(agent, "I")

    events = []

    // Step 2 — evaluate transitions
    for each agent in simulation.agents:
        z = agent.computeZ(simulation.sliders)

        if agent.state == "S":
            p = sigmoid(z - 0.4 * agent.threshold) * 0.02
            if random() < p:
                agent.state = "I"
                events.push(transition_event(agent, "S->I", z))

        elif agent.state == "I":
            p = sigmoid(0.3 + 0.8*z + 0.5*agent.N) * 0.05
            if random() < p:
                agent.state = "M"
                agent.position = sample_external_zone(agent.migDir)
                events.push(transition_event(agent, "I->M", z))

        elif agent.state == "M":
            life_cost_effect = 0.32 * (agent.targetLifeCost * simulation.sliders.lifeCost - 0.62)
            p = sigmoid(-1 + 0.6*agent.f_home - 0.4*agent.abroad_adapt + life_cost_effect) * 0.008
            if random() < p:
                agent.state = "R"
                events.push(transition_event(agent, "M->R", z))

        elif agent.state == "R":
            if random() < 0.01:
                agent.state = "S"
                events.push(transition_event(agent, "R->S", z))

        // Step 3 — geographic update
        agent.move()

    return events
```

### 6.2 Geographic Movement Logic
```
function Agent.move():
    switch state:
        case "S":
            // Brownian + soft pull toward home centroid
            dLat = noise() + HOME_PULL * (homeLat - lat)
            dLon = noise() + HOME_PULL * (homeLon - lon)
        case "I":
            // Directed drift toward the assigned border exit
            target = (migDir == "west") ? WEST_EXIT : EAST_EXIT
            distance = haversine(self, target)
            speed = (distance < 0.32) ? SPEED_DRIFT * 0.18 : SPEED_DRIFT
            apply_drift_toward(target, speed)
        case "M":
            // Random walk inside the external emigrant zone
            apply_brownian()
        case "R":
            target = home_region_centroid
            if distance < 0.10:
                apply_brownian()
            else:
                apply_drift_toward(target, SPEED_RETURN)
```

### 6.3 Network Influence Update (Race-Free Concurrency)
A common mathematical and architectural pitfall in agent-based modeling is the unintended introduction of intra-tick cascade effects ("domino effects"). A naive, sequential implementation would evaluate agents one by one within the `tick()` function loop. In such a flawed and physically unrealistic model, if Agent A decides to migrate, their neighbor Agent B (subsequently evaluated in the exact same loop) instantaneously experiences a higher $N_i$ value, potentially tipping them over the threshold into migrating as well. This creates a statistical chain reaction artificially bound to the order in which agents are mathematically indexed within the system.

To preserve the behavioral integrity of the emergent dynamics, the simulation implements a strict two-phase synchronous update scheme. This design closely mirrors the `synchronous update` principles defined in classic cellular automata architectures.

As implemented in `_updateNetworkInfluence()` inside `Simulation.js`:

1. **Snapshot Phase:** At the exact start of every computational tick—before any transition probabilities are evaluated—the simulation conceptually freezes the global state. It iterates meticulously through the entire network topology, computing the $N_i$ and $D_i$ values accurately and identically for all agents based purely on the historical state of the system at $t-1$.
2. **Evaluation Phase:** Only after all social network parameters are statically pre-computed, cached, and stored onto the individual agent objects, do the transition probabilities evaluate. 

This synchronous, two-phase operation guarantees that an agent's individual decision to change state is genuinely influenced by what their peers *have already demonstrably done* in prior ticks, enforcing a causal chain grounded in authentic behavioral and informational lag. It completely eliminates memory-race conditions and makes the entire simulation macro-trajectory precisely mathematically reproducible when supplied with a predetermined pseudo-random seed.

### 6.4 Data Preprocessing & Normalization
- **Wages** are sampled from log-normal distributions, then min-max normalized to a 0–4 range so coefficients in Z remain interpretable.
- **Costs** are clipped to remove extreme tails before normalization.
- **Network ties** are sampled with three distinct probabilities; total degree is constrained to [3, 8] to prevent hub artifacts.
- **Geographic coordinates** are bounded by `GEO = (45°N, 49°N) × (24.3°E, 31.8°E)`.

---

## 7. Data Sources

### 7.1 Types of Data
| Category | Examples |
|---|---|
| Macroeconomic | GDP per capita, unemployment, average wage by sector |
| Demographic | Age pyramid, population by region, household size |
| Migration flows | Border crossings, residence permits, remittance volume |
| Behavioral | Survey data on intent, optimism, return preferences |
| Digital | Diaspora group sizes, TikTok engagement metrics |

### 7.2 Possible Sources
- **Moldova National Bureau of Statistics (BNS)** — domestic labor and demographic series.
- **Eurostat** — Romanian/EU residence and employment data for diaspora.
- **World Bank KNOMAD** — bilateral migration and remittance estimates.
- **IOM Migration Data Portal** — aggregated flows.
- **UNDP / OECD migration outlooks** — qualitative priors.
- **Custom surveys** — for psychological parameters (optimism δ, threshold).

### 7.3 Reliability & Limitations
- Official data underestimate informal migration (irregular crossings, undeclared residence).
- Behavioral parameters (optimism, survivorship) are not directly observable — they must be inferred or sampled from priors.
- Social-network data are largely proprietary; the model substitutes plausible synthetic networks.
- Bilateral statistics differ between origin and destination authorities, sometimes by 30–50%.

The platform is therefore positioned as an **exploratory/scenario tool**, not a forecasting black box.

---

## 8. User Experience (UX/UI)

### 8.1 Interaction Model
The interface is a **single-page dashboard** organized as a tri-panel layout:
- **Left**: state counters, sliders, run/pause/reset controls, sparkline.
- **Center**: large canvas with orthographic globe inset and Moldova map.
- **Right**: live event feed.
- **Bottom**: ticker bar with run metadata and date stamp.

### 8.2 Key Screens (current scope)
1. **Intro splash** (~2.8 s) — branding + loading hint.
2. **Spawning phase** — agents appear progressively over the map.
3. **Running phase** — full dashboard active.

Planned screens (Section 13):
- Scenario gallery
- Compare-runs view (overlay multiple trajectories)
- Parameter sweep heatmap
- Export (CSV/PNG) panel

### 8.3 Example User Flow
1. Researcher lands on the dashboard.
2. Sees default Moldova simulation already animated.
3. Drags `wageGap` slider from 1.0 to 1.6 → migration counter accelerates within ~5 s.
4. Drags `migrationCost` to 1.8 → flow plateaus and waiting clusters at borders grow visibly.
5. Pauses, hovers an agent dot, reads its Z-score and N/D fractions in the tooltip.
6. Resumes; opens the event feed to see which channels triggered the most recent S→I transitions.

### 8.4 Design Principles
- **Always-on simulation** — no "submit" button; sliders update live.
- **Visible mechanism** — events show *why* each transition happened (channel, Z, neighbors).
- **No modal interruptions** — controls are always reachable.

---

## 9. Technologies Used

| Layer | Technology | Reason |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast HMR, well-known, large ecosystem |
| Rendering | HTML5 Canvas 2D | Cheap per-agent draw cost |
| Charting | Custom SVG (`MiniChart.jsx`) | Avoids large chart-library payload |
| Styling | CSS modules / utility classes | Lean bundle |
| Backend | Python 3.11+, FastAPI, Uvicorn | Async, type-validated, low boilerplate |
| Numerical core | NumPy | Vectorized operations, deterministic with seed |
| Validation | Pydantic v2 | First-class typed request models |
| Build & deploy | Vite (frontend), Docker (backend) | Reproducible builds |
| Versioning | Git + GitHub | Standard |
| Future | PostgreSQL, Redis, Cloudflare Pages, Fly.io | Persistence and edge delivery |

---

## 10. Performance & Scalability

### 10.1 Frontend Engine
- **Population**: 2,000 agents at 180 ms tick, 60 fps render.
- **Cost per tick**: O(N · k) for network influence (k = average degree ≤ 8) → ≈16 k operations / tick — trivial on modern hardware.
- **Render**: O(N) draw calls; halos and edges are culled when offscreen or beneath visibility threshold.
- **Memory**: ~1.5 MB for the agent population.

### 10.2 Backend Engine
- Vectorized NumPy: 5,000 agents × 300 ticks runs in ~1.5 s on a single core.
- Deterministic given `(config, seed)` — supports reproducible research.

### 10.3 Optimization Strategies
- **Network-influence snapshot**: computed once per tick; avoids re-scanning neighbors per transition check.
- **Edge cap (≤ 3 displayed)**: rendering only a sample of edges keeps draw time bounded.
- **Border-cluster glow throttling**: triggered only when ≥ 4 agents are within the threshold radius.
- **Object reuse**: agent objects persist for the entire run; only mutable fields update.

### 10.4 Potential Bottlenecks
| Bottleneck | Mitigation |
|---|---|
| N² adjacency for very large populations | Sparse adjacency lists (already in use); spatial hashing for very large N |
| Canvas draw beyond ~10k agents | Switch to WebGL (regl/PixiJS) |
| Many concurrent backend users | Stateless workers + queue (Celery/RQ) + Redis cache for repeated configs |
| JSON payload size for long histories | Streamed responses or downsampled trajectories |

---

## 11. Security & Privacy

### 11.1 Threat Surface
The platform processes **no personal data** in its current scope. The threats are therefore:
- Abuse of the public `/simulate` endpoint (resource exhaustion).
- Tampering with parameters to crash the engine.
- Future risk: PII when authenticated multi-user dashboards are added.

### 11.2 Mitigations
- **Input validation**: Pydantic enforces ranges and types on every parameter.
- **Rate limiting**: per-IP throttling at the reverse proxy (Nginx / Cloudflare).
- **CORS allow-list**: only trusted frontends may call the API.
- **Resource caps**: maximum `n_agents` and `steps` enforced server-side.
- **No code execution**: parameters are pure scalars; no eval, no serialized callables.
- **HTTPS-only**: TLS termination at the edge.
- **Logging**: anonymized request logs (no IP retention beyond rate-limit window).

### 11.3 Privacy Roadmap (when accounts are added)
- GDPR-aligned: explicit consent, minimal data, right to erase.
- Encryption at rest (AES-256) and in transit (TLS 1.3).
- Role-based access (researcher / institution / admin).
- Periodic security review; dependency scanning (Dependabot, `pip-audit`).

---

## 12. Business Model

The platform supports a **tiered access model**:

| Tier | Audience | Features | Pricing model |
|---|---|---|---|
| **Free / Public** | Students, public, casual users | Browser simulator, default parameters, share links | Free |
| **Researcher** | Academics, NGOs | API access, batch runs, exportable trajectories, saved scenarios | Subscription (modest monthly fee) |
| **Institutional** | Government, ministries, central banks | Custom calibration, private deployments, support, integration | Annual contract |
| **Education** | Universities, schools | Multi-seat, classroom mode | Annual license |

Additional revenue paths:
- **Custom calibration projects** (consulting around specific countries/regions).
- **White-label deployment** for partner institutions.
- **Grant-funded research collaborations**.

The free tier is essential — it builds the user base, generates citations, and creates evidence of impact for grant applications.

---

## 13. Impact & Future Development

### 13.1 Social & Economic Impact
- Provides Moldovan policymakers with a **counterfactual sandbox** for migration policy.
- Lowers the barrier for **academic reproducibility** — every result is a `(config, seed)` away.
- Strengthens **public understanding** by exposing the mechanisms behind migration.
- Useful in **classroom settings** to teach diffusion dynamics, social-network effects, and bounded rationality.

### 13.2 Future Features
1. **Real-time data ingestion**: nightly pulls from BNS, Eurostat, KNOMAD to update priors automatically.
2. **AI parameter calibration**: Bayesian inference (PyMC or numpyro) to fit slider parameters to observed flows.
3. **Multi-country mode**: parameterize geography, regions, and corridor allocations.
4. **Sensitivity analysis dashboard**: Sobol indices for each slider.
5. **Scenario library**: prebuilt realistic scenarios ("EU accession 2030", "remittance shock").
6. **Collaboration mode**: shared scenarios with version history.
7. **Export**: CSV trajectories, PNG snapshots, PDF reports.
8. **Mobile-friendly view**: simplified controls for on-the-go demos.

### 13.3 Research Roadmap
- Validate transition probability calibrations against historical Moldova migration peaks (2007 EU accession of Romania, 2014 visa-free regime).
- Publish a methods paper documenting the network-snapshot scheme and its effect on diffusion timing.

---

## 14. Conclusion

The Economic Migration Simulation platform is a **rigorous, accessible, and reproducible** tool for studying one of the most consequential socio-economic phenomena affecting small open economies. By combining a transparent agent-based mathematical model with a real-time web interface, it bridges the gap between research-grade simulation and stakeholder usability.

For Moldova, the project produces immediate value: it provides researchers with a reproducible environment, policymakers with a counterfactual sandbox, students with an intuition-building tool, and the public with a window into the dynamics that have reshaped the country over two decades.

More broadly, the platform is a template — its architecture generalizes to any country where outward migration is a defining structural force, and where decision-makers deserve better than retrospective statistics.

---

## Appendix A — Three Suggested Visual Diagrams

### Diagram 1 — State Machine
A compact directed graph showing the four states **S**, **I**, **M**, **R** with the four transitions, labeled with their probability formulas:
```
   S ──σ(Z − 0.4θ)·0.02──► I ──σ(0.3 + 0.8Z + 0.5N)·0.05──► M
   ▲                                                          │
   │                                                          │
   └──────── 0.01 ─────── R ◄── σ(−1 + 0.6f − 0.4a)·0.008 ────┘
```
Useful as a single hero diagram on the landing page and in academic papers.

### Diagram 2 — Layered Architecture
A four-band horizontal stack:
1. **Browser** — UI components, sliders, charts.
2. **Frontend simulation engine** — `Agent`, `Simulation`, `MapData`.
3. **Backend** — FastAPI + NumPy engine + Bass reference.
4. **Data layer (planned)** — PostgreSQL `runs`, `trajectories`, `events`, `scenarios`.

Arrows show that the browser engine runs entirely client-side, while the backend is an *optional* batch-research path.

### Diagram 3 — Geographic Schema
Stylized Moldova map showing:
- 6 regional centroids (Chișinău, Nord, Sud, Centru, Găgăuzia, Transnistria) with relative weights.
- **WEST_EXIT** node at the Prut River with a wide arrow into the EU zone.
- **EAST_EXIT** at the Transnistrian corridor with a thinner arrow into the Ukraine zone.
- Probability labels: 87% westward (most regions); 55% westward (Transnistria).

This visual directly mirrors the runtime canvas, making it easy for newcomers to map intuition to UI.

---

## Appendix B — Simplified Explanations for a High-School Audience (LaTeX)

A LaTeX block suitable for inclusion in a teaching handout. It can be compiled directly with `pdflatex`.

```latex
\documentclass[11pt]{article}
\usepackage{amsmath, amssymb}
\usepackage{geometry}
\geometry{margin=1in}
\title{Migration, Made Simple}
\author{Economic Migration Simulation}
\date{}
\begin{document}
\maketitle

\section*{1. Migration as a four-state journey}
Imagine every working-age person as a token on a board with four squares:
\[
\boxed{S}\;\xrightarrow{\text{decides to leave}}\;
\boxed{I}\;\xrightarrow{\text{actually leaves}}\;
\boxed{M}\;\xrightarrow{\text{comes home}}\;
\boxed{R}\;\xrightarrow{\text{back to normal life}}\;\boxed{S}
\]
\textbf{S} = staying, \textbf{I} = intends to migrate,
\textbf{M} = migrated, \textbf{R} = returned. Every tick of the clock,
each person rolls a (biased) die to decide whether to move to the next square.

\section*{2. The migration ``score''}
We compute a number $Z$ for each person -- a kind of \emph{migration appetite}:
\[
Z \;=\; \underbrace{(\text{wage abroad} - \text{wage at home})}_{\text{economic pull}}
\;-\; \underbrace{\text{cost}}_{\text{economic push-back}}
\;+\; \underbrace{\text{friends already abroad}}_{\text{social pull}}
\;+\; \underbrace{\text{social-media buzz}}_{\text{TikTok pull}}.
\]
Big positive $Z$ = strongly wants to leave. Negative $Z$ = happy where they are.

\section*{3. From score to chance}
We turn $Z$ into a probability using the \emph{logistic} function:
\[
\sigma(Z) \;=\; \frac{1}{1 + e^{-Z}}, \qquad 0 \le \sigma(Z) \le 1.
\]
If $\sigma(Z) = 0.7$, the person has a 70\% chance to take that step on this tick.

\section*{4. Why friends matter}
Let $N$ = fraction of your friends already abroad and $D$ = fraction planning to leave.
The score $Z$ \emph{grows} with both:
\[
Z \;\propto\; 2.0\,N \;+\; 1.2\,D.
\]
Migration is contagious: every friend who leaves makes you more likely to leave too.

\section*{5. The big picture}
Run thousands of these dice rolls in parallel and you see realistic curves:
slow start, sudden acceleration, a plateau, then slow returns. That is the
\emph{S-curve} of diffusion -- the same shape that describes how iPhones, fashion,
or rumors spread through a population.

\end{document}
```

### Three plain-language framings (for narration alongside the LaTeX above):
1. **"Migration is a board game"** — four squares, biased dice, friends nudge your roll.
2. **"The score Z is your migration thermometer"** — high reading means you are heating up to leave.
3. **"It spreads like a trend"** — once a few of your friends go, your own probability rises, the same way fashion or apps go viral.

---

*End of report.*
