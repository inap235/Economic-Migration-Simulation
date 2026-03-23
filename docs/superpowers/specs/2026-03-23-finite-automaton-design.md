# Finite Automaton Visualisation — Design Spec
**Date:** 2026-03-23
**Status:** Approved

---


## Overview

Add a live finite automaton diagram to the left panel of the Moldova Migration Simulator dashboard. The diagram shows the four SIMR states as nodes and the four transitions as animated edges, with live agent counts on each node and rolling-average transition rates on each edge. Particles flow along edges whenever transitions fire.

---

## Architecture & Data Flow

### Transition counting in `Simulation.tick()`

`Simulation.tick()` currently caps `newEvents` to 5 before returning (line 162). This cap is intentional for the event feed but must not be used for rate tracking.

**Resolution:** Inside the `tick()` loop, introduce four local counters (`SI`, `IM`, `MR`, `RS`) incremented alongside — and independently of — `newEvents.push`. Return them as `transitionCounts` in the tick result. The final return becomes:

```js
return {
  stats: { ...counts, tick: this.tick_count },
  newEvents: newEvents.slice(0, 5),
  transitionCounts: { SI, IM, MR, RS },
};
```

`App.jsx` reads `transitionCounts` for the rate buffer. `newEvents` (still capped at 5) is used only for the event feed and particle spawning.

### `R→S` event emission (`Simulation.js`)

`R→S` transitions currently fire silently. Add a `newEvents.push` and set `agent.transitionChannel`:

```js
newEvents.push({
  id: `${this.tick_count}-${agent.id}`, type: 'R→S', agentId: agent.id,
  region: agent.region.name, channel: 'return', Z: '—', neighborPct: 0,
});
RS++;
```

Do **not** set `agent.transitionChannel` for R→S — consistent with `M→R` which also does not set it. `AutomatonPanel` derives the edge key from `event.type`, not from `agent.transitionChannel`.

### Rolling rate buffer (`App.jsx`)

- `const [particleTick, setParticleTick] = useState(0)` — integer state incremented **unconditionally on every tick**.
- The existing tick loop in `App.jsx` destructures `{ stats: s, newEvents }` from `tick()` — update this to `{ stats: s, newEvents, transitionCounts }`.
- A `useRef` (`bufferRef`) holds a circular buffer of the last 30 tick `transitionCounts` snapshots. Push on each tick; trim to 30.
- Averaged rates `{ SI, IM, MR, RS }` (buffer mean per field) are passed as `transitionRates` to `LeftPanel` → `AutomatonPanel`.
- `eventsRef = useRef([])` stores the latest tick's `newEvents`. Set `eventsRef.current = newEvents` **before** calling `setParticleTick` in the same synchronous `setInterval` callback, so the ref is populated when the effect reads it.
- `setParticleTick(n => n + 1)` must be called **unconditionally**, outside and independent of the existing `if (newEvents.length > 0)` guard — the automaton effect must fire every tick.
- **On reset:** `handleReset` flushes `bufferRef.current = []`.

### Colour source

`LeftPanel.jsx` currently declares a local `STATE_COLORS` constant (line 12) that duplicates `COLORS` from `config.js`. **Replace it** with `import { COLORS } from '../config.js'` and rename usages from `STATE_COLORS[st]` to `COLORS[st]`. `AutomatonPanel.jsx` should do the same — import `COLORS` from `config.js` directly. This keeps one source of truth for state colours.

---

## New Component: `AutomatonPanel.jsx`

A self-contained SVG React component added at the bottom of `LeftPanel.jsx`, below a `panel-rule` divider and a "State Automaton" label.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `stats` | `{ S, I, M, R }` | Live agent counts per state |
| `transitionRates` | `{ SI, IM, MR, RS }` | Rolling 30-tick avg transitions/tick |
| `eventsRef` | `React.MutableRefObject<Array>` | Ref holding latest tick's `newEvents` |
| `particleTick` | `number` | useState integer; increments every tick to trigger spawn effect |

### Visual Layout

Diamond/rhombus node arrangement. SVG uses `viewBox="0 0 200 180"` with `width="100%"` so it scales responsively to the panel width.

```
        [S]
       ↙   ↖
     [I]   [R]
       ↘   ↗
        [M]
```

**Nodes** — circles, radius 28px. Colours from `COLORS` imported from `config.js`. Each node displays the state letter (bold) and agent count on a second line.

**Edges** — 4 curved `<path>` elements with SVG `<marker>` arrowhead definitions: `S→I`, `I→M`, `M→R`, `R→S`. Each edge has a mid-path rate label (e.g. `2.4/t`) in small, dimmed text (`opacity: 0.55`).

**During spawning / all-zero state:** The diagram renders normally with zero counts and zero rates — no special placeholder needed.

### Particle System

- `AutomatonPanel` maintains a `particlesRef = useRef([])` array (not React state — updates are driven by the rAF loop).
- An `isLoopRunning = useRef(false)` guards against double-starting the rAF loop.
- A `useEffect([particleTick])` reads `eventsRef.current`, maps each event to a particle `{ edgeKey, progress: 0 }`, appends them, and starts the rAF loop if not already running (`!isLoopRunning.current`).
- **`edgeKey` derivation:** `event.type.replace('→', '')` — e.g. `'S→I'` → `'SI'`, `'R→S'` → `'RS'`.
- **Particle cap:** 8 per edge. Excess particles on arrival are **dropped (newest discarded)** — if a given edge already has 8 particles, the incoming particle for that edge is skipped.
- Each rAF frame: advance all `progress` by `~0.04`, remove particles with `progress >= 1`, force a re-render via `setRenderTick(n => n+1)`, then either schedule the next frame or set `isLoopRunning.current = false` if the array is empty.
- The `isLoopRunning` ref prevents the race where new events arrive at the exact frame the loop would cancel: the spawn effect always restarts the loop if `!isLoopRunning.current`.
- Particle colour: `COLORS[sourceState]` where `sourceState` is derived from the event type (first character of `type`).
- **Path refs:** `pathRefs = useRef({})` — a keyed object, one entry per edge, populated via `ref={el => pathRefs.current[edgeKey] = el}` on each `<path>` element. Particle position: `pathRefs.current[particle.edgeKey].getPointAtLength(progress × pathRefs.current[particle.edgeKey].getTotalLength())`.
- Opacity: `Math.min(progress / 0.1, 1) × Math.min((1 - progress) / 0.1, 1)` — fade in first 10%, fade out last 10%.

### Cleanup

`useEffect` cleanup in `AutomatonPanel` cancels any pending rAF handle and resets `isLoopRunning.current = false` on unmount, so a remount (e.g. hot-reload) starts with a clean state.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/simulation/Simulation.js` | Add 4 local tick counters; return `transitionCounts`; add R→S event push |
| `frontend/src/App.jsx` | Add `particleTick` useState, `eventsRef`, 30-tick `bufferRef`; compute `transitionRates`; flush buffer on reset; pass new props to `LeftPanel` |
| `frontend/src/components/LeftPanel.jsx` | Replace local `STATE_COLORS` with `COLORS` import; accept + forward `transitionRates`, `eventsRef`, `particleTick`; render `<AutomatonPanel>` |
| `frontend/src/components/AutomatonPanel.jsx` | New component (SVG diagram + particle system) |

---

## Out of Scope

- Clicking nodes/edges to filter the event feed
- Showing individual agent trajectories through the automaton
- Backend integration
