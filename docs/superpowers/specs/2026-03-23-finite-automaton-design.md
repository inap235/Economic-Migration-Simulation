# Finite Automaton Visualisation — Design Spec
**Date:** 2026-03-23
**Status:** Approved

---

## Overview

Add a live finite automaton diagram to the left panel of the Moldova Migration Simulator dashboard. The diagram shows the four SIMR states as nodes and the four transitions as animated edges, with live agent counts on each node and rolling-average transition rates on each edge. Particles flow along edges whenever transitions fire.

---

## Architecture & Data Flow

### Transition tracking (`App.jsx`)

- A `useRef` holds a circular buffer of the last 30 tick snapshots. Each snapshot is `{ SI, IM, MR, RS }` — counts of each transition type that fired in that tick.
- On every tick, `newEvents` (already returned by `Simulation.tick()`) is scanned to count transitions by type. The snapshot is pushed into the buffer; the buffer is trimmed to 30 entries.
- Averaged rates `{ SI, IM, MR, RS }` are derived from the buffer and passed as the `transitionRates` prop to `LeftPanel` → `AutomatonPanel`.
- Live agent counts come from the existing `stats` prop (`{ S, I, M, R }`).
- Raw `newEvents` are also forwarded so `AutomatonPanel` can spawn particles.

### `R→S` event emission (`Simulation.js`)

`R→S` transitions currently fire silently. A one-line change adds a `newEvents` push for this transition so particles appear on the R→S edge.

---

## New Component: `AutomatonPanel.jsx`

A self-contained SVG React component added at the bottom of `LeftPanel.jsx`, below a `panel-rule` divider and a "State Automaton" label.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `stats` | `{ S, I, M, R }` | Live agent counts per state |
| `transitionRates` | `{ SI, IM, MR, RS }` | Rolling 30-tick avg transitions/tick |
| `newEvents` | `Array<{ type }>` | Events from the latest tick (particle triggers) |

### Visual Layout

Diamond/rhombus node arrangement within a ~200×180px SVG:

```
        [S]
       ↙   ↖
     [I]   [R]
       ↘   ↗
        [M]
```

**Nodes** — circles, radius 28px, filled with existing state colours:
- S: `#4A90D9` (blue)
- I: `#F5A623` (orange)
- M: `#E74C3C` (red)
- R: `#2ECC71` (green)

Each node displays the state letter and agent count (two lines, small font).

**Edges** — 4 curved `<path>` elements with SVG arrowhead markers:
- `S→I`, `I→M`, `M→R`, `R→S`

Each edge has a mid-path rate label (e.g. `2.4/t`) in small, dimmed text.

### Particle System

- On each `newEvents` batch, one particle is spawned per event on its corresponding edge path.
- Particles are capped at **8 per edge** to prevent visual clutter during high-activity bursts.
- Each particle stores `{ edgeKey, progress: 0 }` and advances `~0.04` per animation frame.
- Position is computed via `pathRef.current.getPointAtLength(progress × path.getTotalLength())`.
- Particles fade in at start and fade out near completion (opacity driven by progress).
- Particle colour matches the source state colour.
- The `requestAnimationFrame` loop runs only while particles are present and cancels itself when the array is empty to avoid idle CPU usage.

### SVG Path References

Four `useRef` instances (one per edge path) allow synchronous `getPointAtLength` calls at 60 fps. With a maximum of 32 total particles (8 × 4 edges) this is well within safe performance bounds.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/simulation/Simulation.js` | Add `newEvents` push for R→S transition |
| `frontend/src/App.jsx` | Add 30-tick transition buffer; compute `transitionRates`; pass to `LeftPanel` |
| `frontend/src/components/LeftPanel.jsx` | Accept + forward `transitionRates` and `newEvents`; render `<AutomatonPanel>` |
| `frontend/src/components/AutomatonPanel.jsx` | New component (SVG diagram + particle system) |

---

## Out of Scope

- Clicking nodes/edges to filter the event feed
- Showing individual agent trajectories through the automaton
- Backend integration
