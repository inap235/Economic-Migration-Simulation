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
