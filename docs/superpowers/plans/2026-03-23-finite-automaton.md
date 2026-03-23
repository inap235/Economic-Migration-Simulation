# Finite Automaton Visualisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live animated finite automaton diagram to the left panel showing SIMR state nodes with agent counts, transition edges with rolling-average rates, and particles flowing along edges when transitions fire.

**Architecture:** Five tasks in dependency order — extend `Simulation.tick()` first (pure logic), wire data in `App.jsx`, create `AutomatonPanel.jsx` (must exist before it is imported), update `LeftPanel.jsx` to import and mount it, then do a final integration check. No new dependencies added.

**Tech Stack:** React 18, SVG (native browser), `requestAnimationFrame`, Vite dev server

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `frontend/src/simulation/Simulation.js` | Modify | Add `transitionCounts` return; add R→S event push |
| `frontend/src/App.jsx` | Modify | Rolling buffer, `particleTick`, `eventsRef`, `transitionRates` |
| `frontend/src/components/AutomatonPanel.jsx` | **Create first** | SVG diagram + particle rAF system |
| `frontend/src/components/LeftPanel.jsx` | Modify last | Replace `STATE_COLORS`; import + mount `AutomatonPanel`; forward props |

> **Order note:** `AutomatonPanel.jsx` is created (Task 3) before `LeftPanel.jsx` imports it (Task 4). Importing a non-existent module in Vite breaks the entire HMR bundle — the page goes white. Never add the import before the file exists.

---

## Task 1: Extend `Simulation.tick()` — transition counters + R→S event

**Files:**
- Modify: `frontend/src/simulation/Simulation.js`

- [ ] **Step 1.1 — Fix the early-return to include `transitionCounts`**

  Line 82 has an early return for zero-agent state. Update it:

  ```js
  // BEFORE:
  if (!n) return { stats: { S: 0, I: 0, M: 0, R: 0, tick: 0 }, newEvents: [] };

  // AFTER:
  if (!n) return { stats: { S: 0, I: 0, M: 0, R: 0, tick: 0 }, newEvents: [], transitionCounts: { SI: 0, IM: 0, MR: 0, RS: 0 } };
  ```

- [ ] **Step 1.2 — Add four local counters at the top of the tick loop**

  At line 88, just after `const newEvents = [];`, add:

  ```js
  let SI = 0, IM = 0, MR = 0, RS = 0;
  ```

- [ ] **Step 1.3 — Increment counters alongside each `newEvents.push`**

  In the `S→I` branch, after its `newEvents.push({...})`, add `SI++;`

  In the `I→M` branch, after its `newEvents.push({...})`, add `IM++;`

  In the `M→R` branch, after its `newEvents.push({...})`, add `MR++;`

- [ ] **Step 1.4 — Add R→S event push and RS counter**

  In the `R→S` branch, replace the silent state assignment:

  ```js
  // BEFORE:
  } else if (agent.state === 'R') {
    if (Math.random() < 0.01) {
      agent.state      = 'S';
      agent.halo       = 0.4;
      agent.migDir     = null;
      agent.nearBorder = false;
    }
  }
  ```

  with:

  ```js
  } else if (agent.state === 'R') {
    if (Math.random() < 0.01) {
      agent.state      = 'S';
      agent.halo       = 0.4;
      agent.migDir     = null;
      agent.nearBorder = false;
      newEvents.push({
        id: `${this.tick_count}-${agent.id}`, type: 'R→S', agentId: agent.id,
        region: agent.region.name, channel: 'return', Z: '—', neighborPct: 0,
      });
      RS++;
    }
  }
  ```

- [ ] **Step 1.5 — Return `transitionCounts` from the main return**

  Replace the final return (line ~162):

  ```js
  // BEFORE:
  return { stats: { ...counts, tick: this.tick_count }, newEvents: newEvents.slice(0, 5) };

  // AFTER:
  return {
    stats: { ...counts, tick: this.tick_count },
    newEvents: newEvents.slice(0, 5),
    transitionCounts: { SI, IM, MR, RS },
  };
  ```

- [ ] **Step 1.6 — Verify: no console errors, simulation runs as before**

  Run `npm run dev` from `frontend/`. Open the browser. The dashboard should run exactly as before — no visible change, no JS errors.

- [ ] **Step 1.7 — Commit**

  ```bash
  git add frontend/src/simulation/Simulation.js
  git commit -m "feat: add transitionCounts to tick() return; emit R→S events"
  ```

---

## Task 2: Wire data flow in `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 2.1 — Add new state and refs**

  After the existing `useState`/`useRef` declarations (around line 13–20), add:

  ```js
  const [particleTick,    setParticleTick]    = useState(0);
  const [transitionRates, setTransitionRates] = useState({ SI: 0, IM: 0, MR: 0, RS: 0 });
  const bufferRef = useRef([]);  // circular buffer of last 30 transitionCounts snapshots
  const eventsRef = useRef([]);  // latest tick's newEvents (read by AutomatonPanel)
  ```

- [ ] **Step 2.2 — Update the tick loop**

  Replace the main tick `useEffect` (around line 46–55) entirely:

  ```js
  useEffect(() => {
    if (!running || phase !== 'running') return;
    const iv = setInterval(() => {
      const { stats: s, newEvents, transitionCounts } = simRef.current.tick();
      setStats(s);

      // Rolling 30-tick buffer for transition rates
      bufferRef.current = [...bufferRef.current, transitionCounts].slice(-30);
      const buf = bufferRef.current;
      const avg = field => buf.reduce((sum, e) => sum + (e[field] ?? 0), 0) / buf.length;
      setTransitionRates({ SI: avg('SI'), IM: avg('IM'), MR: avg('MR'), RS: avg('RS') });

      // Store events ref BEFORE incrementing particleTick
      eventsRef.current = newEvents;
      setParticleTick(n => n + 1);  // unconditional — fires automaton effect every tick

      if (newEvents.length > 0) {
        setEvents(prev => [...prev, ...newEvents].slice(-20));
      }
    }, TICK_MS);
    return () => clearInterval(iv);
  }, [running, phase]);
  ```

- [ ] **Step 2.3 — Flush refs on reset**

  In `handleReset`, add two flushes after `setRunning(false)`:

  ```js
  const handleReset = useCallback(() => {
    setRunning(false);
    bufferRef.current  = [];
    eventsRef.current  = [];
    setEvents([]);
    setPhase('spawning');
    simRef.current?.reset(sliders);
  }, [sliders]);
  ```

- [ ] **Step 2.4 — Pass new props to `LeftPanel`**

  Update the `<LeftPanel>` element:

  ```jsx
  <LeftPanel
    stats={stats}
    sliders={sliders}
    onSliderChange={handleSlider}
    onRunPause={handleRunPause}
    onReset={handleReset}
    running={running}
    history={history}
    transitionRates={transitionRates}
    eventsRef={eventsRef}
    particleTick={particleTick}
  />
  ```

- [ ] **Step 2.5 — Verify: no console errors, simulation runs as before**

  No visible change yet. Confirm no errors.

- [ ] **Step 2.6 — Commit**

  ```bash
  git add frontend/src/App.jsx
  git commit -m "feat: add rolling transitionRates buffer and particleTick wiring in App"
  ```

---

## Task 3: Create `AutomatonPanel.jsx`

> Create this file **before** `LeftPanel.jsx` imports it. Vite will crash the entire HMR bundle if you import a missing module.

**Files:**
- Create: `frontend/src/components/AutomatonPanel.jsx`

- [ ] **Step 3.1 — Create the file with geometry constants**

  ```jsx
  import { useRef, useState, useEffect } from 'react';
  import { COLORS } from '../config.js';

  // Node positions within viewBox="0 0 200 180"
  // Diamond layout: S=top, I=left, M=bottom, R=right
  const NODES = {
    S: { cx: 100, cy: 22  },
    I: { cx: 28,  cy: 95  },
    M: { cx: 100, cy: 162 },
    R: { cx: 172, cy: 95  },
  };

  // Each edge: SVG path string + label midpoint coordinates
  const EDGES = {
    SI: { d: 'M 87,42  Q 40,55  40,78',        mid: [44, 56]   },
    IM: { d: 'M 40,112 Q 40,148 87,158',        mid: [44, 144]  },
    MR: { d: 'M 113,158 Q 160,148 160,112',     mid: [156, 144] },
    RS: { d: 'M 160,78  Q 160,55  113,42',      mid: [156, 56]  },
  };

  // Incrementing counter for stable particle keys
  let _particleId = 0;
  ```

- [ ] **Step 3.2 — Write the component**

  ```jsx
  export default function AutomatonPanel({ stats, transitionRates, eventsRef, particleTick }) {
    const [renderTick,  setRenderTick]  = useState(0);
    const particlesRef  = useRef([]);
    const isLoopRunning = useRef(false);
    const rafHandleRef  = useRef(null);
    const pathRefs      = useRef({});

    // ── Particle system ──────────────────────────────────────────────────────

    // Spawn particles on every tick, inlined to avoid stale-closure issues
    useEffect(() => {
      const events = eventsRef?.current ?? [];
      for (const ev of events) {
        const edgeKey = ev.type.replace('→', '');
        if (!EDGES[edgeKey]) continue;
        const count = particlesRef.current.filter(p => p.edgeKey === edgeKey).length;
        if (count >= 8) continue;  // cap: drop newest
        particlesRef.current.push({ edgeKey, progress: 0, id: ++_particleId });
      }

      // Start rAF loop if not already running
      if (!isLoopRunning.current) {
        isLoopRunning.current = true;
        const frame = () => {
          for (const p of particlesRef.current) p.progress += 0.04;
          particlesRef.current = particlesRef.current.filter(p => p.progress < 1);
          setRenderTick(n => n + 1);
          if (particlesRef.current.length > 0) {
            rafHandleRef.current = requestAnimationFrame(frame);
          } else {
            isLoopRunning.current = false;
          }
        };
        rafHandleRef.current = requestAnimationFrame(frame);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [particleTick]);

    // Cancel rAF on unmount; reset guard so remount starts cleanly
    useEffect(() => {
      return () => {
        cancelAnimationFrame(rafHandleRef.current);
        isLoopRunning.current = false;
      };
    }, []);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
      <svg viewBox="0 0 200 180" width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <marker id="fa-arrow" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(232,228,217,0.35)" />
          </marker>
        </defs>

        {/* Edges */}
        {Object.entries(EDGES).map(([key, edge]) => {
          const rate = transitionRates?.[key];
          const label = Number.isFinite(rate) ? rate.toFixed(1) : '0.0';
          return (
            <g key={key}>
              <path
                ref={el => { pathRefs.current[key] = el; }}
                d={edge.d}
                fill="none"
                stroke="rgba(232,228,217,0.18)"
                strokeWidth="1.5"
                markerEnd="url(#fa-arrow)"
              />
              <text
                x={edge.mid[0]} y={edge.mid[1]}
                textAnchor="middle" fontSize="7"
                fill="rgba(232,228,217,0.45)"
              >
                {label}/t
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {Object.entries(NODES).map(([state, node]) => (
          <g key={state}>
            <circle
              cx={node.cx} cy={node.cy} r={22}
              fill={COLORS[state]} fillOpacity={0.15}
              stroke={COLORS[state]} strokeWidth={1.5}
            />
            <text x={node.cx} y={node.cy - 3}
              textAnchor="middle" fontSize="11" fontWeight="bold"
              fill={COLORS[state]}>
              {state}
            </text>
            <text x={node.cx} y={node.cy + 10}
              textAnchor="middle" fontSize="8"
              fill={COLORS[state]} fillOpacity={0.8}>
              {stats?.[state] ?? 0}
            </text>
          </g>
        ))}

        {/* Particles */}
        {particlesRef.current.map(p => {
          const pathEl = pathRefs.current[p.edgeKey];
          if (!pathEl) return null;
          const len    = pathEl.getTotalLength();
          const pt     = pathEl.getPointAtLength(p.progress * len);
          const fadeIn  = Math.min(p.progress / 0.1, 1);
          const fadeOut = Math.min((1 - p.progress) / 0.1, 1);
          const srcState = p.edgeKey[0];
          return (
            <circle
              key={p.id}
              cx={pt.x} cy={pt.y} r={3}
              fill={COLORS[srcState]}
              opacity={fadeIn * fadeOut}
              style={{ filter: `drop-shadow(0 0 3px ${COLORS[srcState]})` }}
            />
          );
        })}
      </svg>
    );
  }
  ```

- [ ] **Step 3.3 — Verify the file is valid: no Vite errors**

  The file is not imported yet so nothing will render. Just confirm `npm run dev` still runs without a build error.

- [ ] **Step 3.4 — Commit**

  ```bash
  git add frontend/src/components/AutomatonPanel.jsx
  git commit -m "feat: add AutomatonPanel SVG finite automaton with particle system"
  ```

---

## Task 4: Update `LeftPanel.jsx` — import, forward props, mount

**Files:**
- Modify: `frontend/src/components/LeftPanel.jsx`
- Modify: `frontend/src/styles/panels.css`

- [ ] **Step 4.1 — Replace `STATE_COLORS` with `COLORS` import**

  Add to the imports at the top:
  ```js
  import { COLORS } from '../config.js';
  ```

  Delete line 12:
  ```js
  // DELETE:
  const STATE_COLORS = { S: '#4A90D9', I: '#F5A623', M: '#E74C3C', R: '#2ECC71' };
  ```

  Replace all three usages of `STATE_COLORS` with `COLORS`:
  - `style={{ '--c': STATE_COLORS[st] }}` → `style={{ '--c': COLORS[st] }}`
  - `color={STATE_COLORS[st]}` → `color={COLORS[st]}`
  - `background: STATE_COLORS[st]` → `background: COLORS[st]`

  Note: `COLORS` also contains `bg`, `panel`, `accent`, `text` keys — only the `S/I/M/R` keys are used here, which is safe.

- [ ] **Step 4.2 — Add `AutomatonPanel` import**

  ```js
  import AutomatonPanel from './AutomatonPanel.jsx';
  ```

- [ ] **Step 4.3 — Update the function signature to accept new props**

  ```js
  // BEFORE:
  export default function LeftPanel({ stats, sliders, onSliderChange, onRunPause, onReset, running, history }) {

  // AFTER:
  export default function LeftPanel({ stats, sliders, onSliderChange, onRunPause, onReset, running, history, transitionRates, eventsRef, particleTick }) {
  ```

- [ ] **Step 4.4 — Render `AutomatonPanel` before `panel-footer`**

  Find `<div className="panel-footer">` and insert immediately before it:

  ```jsx
  <div className="panel-rule" />
  <section className="automaton-section">
    <div className="automaton-label">State Automaton</div>
    <AutomatonPanel
      stats={stats}
      transitionRates={transitionRates}
      eventsRef={eventsRef}
      particleTick={particleTick}
    />
  </section>
  ```

- [ ] **Step 4.5 — Add CSS for the new section**

  Open `frontend/src/styles/panels.css` and append at the end:

  ```css
  .automaton-section {
    padding: 0 8px 8px;
  }

  .automaton-label {
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(232, 228, 217, 0.4);
    margin-bottom: 6px;
  }
  ```

  Note: `.panel-footer` uses `margin-top: auto` (flex spacer), which pushes itself to the bottom of the panel. The automaton section sits above it; the panel already has `overflow-y: auto` so it scrolls if content overflows.

- [ ] **Step 4.6 — Verify full diagram in the browser**

  Reload. You should see:
  - Diamond layout with 4 coloured nodes (S blue, I orange, M red, R green)
  - Live agent counts updating inside each node on every tick
  - Curved arrows between nodes with rate labels (initially `0.0/t`, non-zero after ~5 ticks)
  - Glowing particles flowing along edges whenever transitions fire
  - R→S particles appearing (green dots, top-right arc) when agents return

- [ ] **Step 4.7 — Commit**

  ```bash
  git add frontend/src/components/LeftPanel.jsx frontend/src/styles/panels.css
  git commit -m "feat: mount AutomatonPanel in LeftPanel; replace STATE_COLORS with COLORS"
  ```

---

## Task 5: Final integration check

- [ ] **Step 5.1 — Test the reset cycle**

  Hit Reset in the browser. Confirm:
  - Rate labels immediately show `0.0/t` (buffer flushed)
  - No stale particles from the previous run appear
  - Particle animation resumes once the simulation starts ticking again

- [ ] **Step 5.2 — Run the production build**

  ```bash
  cd frontend && npm run build
  ```

  Expected: exits with no errors. Bundle size warnings are fine.

- [ ] **Step 5.3 — Commit**

  ```bash
  git add -A
  git commit -m "build: production build with finite automaton feature"
  ```
