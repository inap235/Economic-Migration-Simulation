import { useRef, useEffect, useCallback } from 'react';
import { GEO, MOLDOVA_BORDER, ROMANIA_BORDER, UKRAINE_BORDER } from '../config.js';
import { WEST_ZONE, EAST_ZONE, WEST_EXIT, EAST_EXIT } from '../simulation/MapData.js';

// ─── Orthographic Globe ───────────────────────────────────────────────────────
const GLOBE_R   = 78;
const GLOBE_PAD = 18;
const LAT0      = 47.0 * Math.PI / 180;
const LON0      = 28.8 * Math.PI / 180;

/** Orthographic projection: (lat°, lon°) → canvas {x, y, z}. z > 0 = visible. */
function orthoProject(lat, lon, cx, cy) {
  const phi = lat * Math.PI / 180;
  const lam = lon * Math.PI / 180;
  const x =  Math.cos(phi) * Math.sin(lam - LON0);
  const y =  Math.sin(phi) * Math.cos(LAT0) - Math.cos(phi) * Math.sin(LAT0) * Math.cos(lam - LON0);
  const z =  Math.sin(phi) * Math.sin(LAT0) + Math.cos(phi) * Math.cos(LAT0) * Math.cos(lam - LON0);
  return { x: cx + x * GLOBE_R, y: cy - y * GLOBE_R, z };
}

function drawGlobe(ctx, migFraction) {
  const cx = GLOBE_PAD + GLOBE_R;
  const cy = GLOBE_PAD + GLOBE_R;

  // Sphere fill
  const sphere = ctx.createRadialGradient(
    cx - GLOBE_R * 0.28, cy - GLOBE_R * 0.28, 0,
    cx, cy, GLOBE_R
  );
  sphere.addColorStop(0,    'rgba(22, 44, 96, 0.97)');
  sphere.addColorStop(0.65, 'rgba(8, 18, 48, 0.97)');
  sphere.addColorStop(1,    'rgba(4, 9, 28, 0.97)');
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(cx, cy, GLOBE_R, 0, Math.PI * 2);
  ctx.fill();

  // Atmosphere rim
  const atmo = ctx.createRadialGradient(cx, cy, GLOBE_R * 0.86, cx, cy, GLOBE_R * 1.10);
  atmo.addColorStop(0, 'rgba(90, 150, 255, 0.18)');
  atmo.addColorStop(1, 'transparent');
  ctx.fillStyle = atmo;
  ctx.beginPath();
  ctx.arc(cx, cy, GLOBE_R * 1.10, 0, Math.PI * 2);
  ctx.fill();

  // Clip all interior drawing to sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, GLOBE_R - 0.5, 0, Math.PI * 2);
  ctx.clip();

  // Lat/lon grid
  ctx.lineWidth   = 0.45;
  ctx.strokeStyle = 'rgba(74, 144, 217, 0.14)';
  for (let lat = -80; lat <= 80; lat += 10) {
    let first = true;
    ctx.beginPath();
    for (let lon = -180; lon <= 180; lon += 3) {
      const p = orthoProject(lat, lon, cx, cy);
      if (p.z < 0) { first = true; continue; }
      if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (let lon = -180; lon < 180; lon += 20) {
    let first = true;
    ctx.beginPath();
    for (let lat = -90; lat <= 90; lat += 2) {
      const p = orthoProject(lat, lon, cx, cy);
      if (p.z < 0) { first = true; continue; }
      if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // Moldova centroid pulse (approximate highlight on globe)
  const pc = orthoProject(47.005, 28.857, cx, cy);
  const pulsR = 4 + migFraction * 10;
  const pulse = ctx.createRadialGradient(pc.x, pc.y, 0, pc.x, pc.y, pulsR);
  pulse.addColorStop(0, `rgba(231,76,60,${(0.5 + migFraction * 0.45).toFixed(2)})`);
  pulse.addColorStop(1, 'transparent');
  ctx.fillStyle = pulse;
  ctx.beginPath();
  ctx.arc(pc.x, pc.y, pulsR, 0, Math.PI * 2);
  ctx.fill();

  // Minor Moldova highlight ring
  ctx.strokeStyle = 'rgba(245,166,35,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(pc.x, pc.y, 7 + migFraction * 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  // Globe rim
  ctx.strokeStyle = 'rgba(74,144,217,0.25)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, GLOBE_R, 0, Math.PI * 2);
  ctx.stroke();

  // Coordinate label
  ctx.font      = '8px "IBM Plex Mono",monospace';
  ctx.fillStyle = 'rgba(232,228,217,0.38)';
  ctx.textAlign = 'center';
  ctx.fillText('47°N  28°E', cx, cy + GLOBE_R + 13);
  ctx.textAlign = 'left';
}

// ─── Map projection helpers ───────────────────────────────────────────────────

const SC = { S: '#4A90D9', I: '#F5A623', M: '#E74C3C', R: '#2ECC71' };

/** Map (lat, lon) → canvas (x, y). */
function project(lat, lon, W, H, pad = 22) {
  // Normalize service: if coordinates in [0,1], treat as normalized map fractions.
  const isNormalized = lat >= 0 && lat <= 1 && lon >= 0 && lon <= 1;
  if (isNormalized) {
    const x = pad + lon * (W - 2 * pad);
    const y = pad + (1 - lat) * (H - 2 * pad);
    return [x, y];
  }

  const x = pad + ((lon - GEO.lonMin) / (GEO.lonMax - GEO.lonMin)) * (W - 2 * pad);
  const y = pad + ((GEO.latMax - lat) / (GEO.latMax - GEO.latMin)) * (H - 2 * pad);
  return [x, y];
}

function tickToDate(t) {
  const y = 2015 + Math.floor(t / 12);
  const m = (t % 12) + 1;
  return `${String(m).padStart(2, '0')} / ${y}`;
}

// ─── Drawing functions ────────────────────────────────────────────────────────

/**
 * Faint glow halos marking the external emigrant zones (Romania/EU and Ukraine/Russia).
 * Drawn before the Moldova border so the border sits on top.
 */
function drawExternalZones(ctx, W, H) {
  // ── West zone (Romania / EU) ────────────────────────────────────────────────
  const [wx, wy] = project(WEST_ZONE.latC, WEST_ZONE.lonC, W, H);
  const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, 88);
  wg.addColorStop(0,   'rgba(74, 144, 217, 0.055)');
  wg.addColorStop(0.55,'rgba(74, 144, 217, 0.022)');
  wg.addColorStop(1,   'transparent');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.arc(wx, wy, 88, 0, Math.PI * 2);
  ctx.fill();

  ctx.font      = '8px "IBM Plex Mono",monospace';
  ctx.fillStyle = 'rgba(74, 144, 217, 0.32)';
  ctx.textAlign = 'center';
  ctx.fillText('EU / Romania', wx, wy - 8);
  ctx.fillStyle = 'rgba(74, 144, 217, 0.18)';
  ctx.fillText('← emigrant zone', wx, wy + 6);

  // ── East zone (Ukraine / Russia) ────────────────────────────────────────────
  const [ex, ey] = project(EAST_ZONE.latC, EAST_ZONE.lonC, W, H);
  const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 62);
  eg.addColorStop(0,   'rgba(231, 76, 60, 0.048)');
  eg.addColorStop(0.55,'rgba(231, 76, 60, 0.018)');
  eg.addColorStop(1,   'transparent');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(ex, ey, 62, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(231, 76, 60, 0.32)';
  ctx.fillText('Ukraine / Russia', ex, ey - 8);
  ctx.fillStyle = 'rgba(231, 76, 60, 0.18)';
  ctx.fillText('emigrant zone →', ex, ey + 6);
  ctx.textAlign = 'left';
}

function drawPolygon(ctx, points, W, H, fill, stroke) {
  if (!points || points.length < 3) return;
  ctx.beginPath();
  points.forEach(([lat, lon], i) => {
    const [x, y] = project(lat, lon, W, H);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle   = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth   = 1.1;
  ctx.setLineDash([7, 5]);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
}

function drawCountryEdge(ctx, points, W, H, color, width = 2.0, dash = [9, 5]) {
  if (!points || points.length < 2) return;
  ctx.beginPath();
  points.forEach(([lat, lon], i) => {
    const [x, y] = project(lat, lon, W, H);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.lineDashOffset = (Date.now() / 80) % 14; // subtle motion suggest flow
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
}

function drawSplitCountryPanels(ctx, W, H) {
  const w3 = W / 3;
  // Romania (left)
  ctx.fillStyle = 'rgba(43, 72, 123, 0.15)';
  ctx.fillRect(0, 0, w3, H);
  // Moldova (center)
  ctx.fillStyle = 'rgba(197, 141, 42, 0.14)';
  ctx.fillRect(w3, 0, w3, H);
  // Ukraine (right)
  ctx.fillStyle = 'rgba(139, 42, 52, 0.15)';
  ctx.fillRect(w3 * 2, 0, w3, H);

  // Vertical separators
  ctx.strokeStyle = 'rgba(232,228,217,0.28)';
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(w3, 0); ctx.lineTo(w3, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w3 * 2, 0); ctx.lineTo(w3 * 2, H); ctx.stroke();

  // country labels
  ctx.font = 'bold 20px "IBM Plex Mono",monospace';
  // Romania moved to left top, further right by even larger offset
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(80, 145, 214, 0.88)';
  ctx.fillText('ROMANIA', 180, 28);
  // Moldova and Ukraine remain same-level top labels
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(245, 166, 35, 0.88)';
  ctx.fillText('MOLDOVA', w3 + w3 / 2, 28);
  ctx.fillStyle = 'rgba(231, 76, 60, 0.88)';
  ctx.fillText('UKRAINE', w3 * 2 + w3 / 2, 28);

  // metric label
  ctx.font      = '10px "IBM Plex Mono",monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(232,228,217,0.62)';
  ctx.fillText('Split-screen country zones (left/center/right)', 10, H - 14);
}

function drawCountryBorders(ctx, W, H) {
  // Only split-screen country sections; remove geographic outlines and dashed edges.
  drawSplitCountryPanels(ctx, W, H);
}

function drawCountryLabels(ctx, W, H) {
  // Disabled – split-screen headers are used instead (same horizontal level).
}

function drawGlow(ctx, W, H) {
  const [cx, cy] = project(47.005, 28.857, W, H);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.38);
  g.addColorStop(0,   'rgba(245,166,35,0.07)');
  g.addColorStop(0.4, 'rgba(74,144,217,0.04)');
  g.addColorStop(1,   'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Amber glow centred on the centroid of I-state agents currently waiting at each
 * border exit. Glow radius scales with cluster size, giving a clear visual signal
 * of pre-emigration pressure building at the border.
 */
function drawBorderClusterGlow(ctx, agents, W, H) {
  const westCluster = agents.filter(a => a.state === 'I' && a.nearBorder && a.migDir === 'west');
  const eastCluster = agents.filter(a => a.state === 'I' && a.nearBorder && a.migDir === 'east');

  const pulse = 0.28 + 0.14 * Math.sin(Date.now() / 240);
  for (const [cluster] of [[westCluster], [eastCluster]]) {
    if (cluster.length < 4) continue;
    let sumX = 0, sumY = 0;
    for (const a of cluster) {
      const [x, y] = project(a.lat, a.lon, W, H);
      sumX += x; sumY += y;
    }
    const cx = sumX / cluster.length;
    const cy = sumY / cluster.length;
    const r  = Math.min(16 + cluster.length * 0.65, 52);
    const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0,   `rgba(245,166,35,${(0.20 + pulse).toFixed(3)})`);
    g.addColorStop(0.45, `rgba(245,166,35,${(0.05 + pulse * 0.8).toFixed(3)})`);
    g.addColorStop(1,   'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r + (2 + pulse * 12), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDateStamp(ctx, W, tick) {
  ctx.font      = '11px "IBM Plex Mono",monospace';
  ctx.fillStyle = 'rgba(245,166,35,0.85)';
  ctx.textAlign = 'right';
  ctx.fillText(tickToDate(tick), W - 14, 22);
  ctx.font      = '9px "IBM Plex Mono",monospace';
  ctx.fillStyle = 'rgba(232,228,217,0.38)';
  ctx.fillText(`T+${tick}`, W - 14, 36);
  ctx.textAlign = 'left';
}

function drawLegend(ctx, W, H, s) {
  const total  = (s.S || 0) + (s.I || 0) + (s.M || 0) + (s.R || 0) || 1;
  const states = ['S', 'I', 'M', 'R'];
  const lbls   = { S: 'Staying', I: 'Intent', M: 'Migrated', R: 'Returned' };
  const lx = W - 142, ly = H - 96;

  ctx.fillStyle = 'rgba(10,14,26,0.80)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(lx - 8, ly - 8, 138, 90, 4);
  else ctx.rect(lx - 8, ly - 8, 138, 90);
  ctx.fill();

  states.forEach((st, i) => {
    const ry = ly + i * 20;
    ctx.fillStyle = SC[st];
    ctx.beginPath(); ctx.arc(lx + 4, ry + 5, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.font      = '10px "IBM Plex Mono",monospace';
    ctx.fillStyle = 'rgba(232,228,217,0.72)';
    ctx.fillText(lbls[st], lx + 14, ry + 9);
    ctx.fillStyle = SC[st];
    ctx.textAlign = 'right';
    ctx.fillText(`${((s[st] || 0) / total * 100).toFixed(1)}%`, lx + 130, ry + 9);
    ctx.textAlign = 'left';
  });
}

// ─── React component ──────────────────────────────────────────────────────────

export default function SimCanvas({ simRef, stats, showNetwork }) {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const tooltipRef = useRef(null);
  const hoverRef   = useRef(null);
  const statsRef   = useRef(stats);

  // Keep statsRef current without restarting the RAF loop
  useEffect(() => { statsRef.current = stats; }, [stats]);

  // ResizeObserver keeps canvas buffer = layout size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sync = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Single long-lived RAF render loop — reads refs, never restarts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;

      // ── Background ──────────────────────────────────────────────────────────
      ctx.fillStyle = '#070B14';
      ctx.fillRect(0, 0, W, H);

          // ── Ambient glow + external zones + country borders ────────────────────
      drawGlow(ctx, W, H);
      drawExternalZones(ctx, W, H);
      drawCountryBorders(ctx, W, H);

      const sim    = simRef.current;
      const agents = sim?.agents ?? [];

      if (agents.length > 0) {
        // ── Network edges: I↔M neighbors (capped at 3 per agent for perf) ─────
        if (showNetwork) {
          ctx.globalAlpha = 0.15;
          ctx.lineWidth   = 0.45;
          for (const a of agents) {
            if (a.state !== 'I' && a.state !== 'M') continue;
            const [ax, ay] = project(a.lat, a.lon, W, H);
            for (const ci of a.connections.slice(0, 3)) {
              const b = agents[ci];
              if (!b || (b.state !== 'I' && b.state !== 'M')) continue;
              const [bx, by] = project(b.lat, b.lon, W, H);
              ctx.strokeStyle = SC[a.state];
              ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
            }
          }
          ctx.globalAlpha = 1;
        }

        // ── Border cluster glow ──────────────────────────────────────────────
        drawBorderClusterGlow(ctx, agents, W, H);

        // ── Agent halos (drawn behind dots) ─────────────────────────────────
        for (const a of agents) {
          if (a.halo < 0.04) continue;
          const [x, y]  = project(a.lat, a.lon, W, H);
          const radius   = 3 + a.halo * 13;
          const hex      = SC[a.state];
          const alpha    = Math.round(a.halo * 180).toString(16).padStart(2, '0');
          const hg       = ctx.createRadialGradient(x, y, 0, x, y, radius);
          hg.addColorStop(0, hex + alpha);
          hg.addColorStop(1, 'transparent');
          ctx.fillStyle  = hg;
          ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
        }

        // ── Agent dots ───────────────────────────────────────────────────────
        for (const a of agents) {
          const [x, y]    = project(a.lat, a.lon, W, H);
          ctx.globalAlpha = a.state === 'M' ? 0.92 : 0.72;
          ctx.fillStyle   = SC[a.state];
          ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // ── Hover ring ───────────────────────────────────────────────────────
        const hov = hoverRef.current;
        if (hov) {
          const [hx, hy] = project(hov.lat, hov.lon, W, H);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth   = 1.5;
          ctx.beginPath(); ctx.arc(hx, hy, 5.5, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // ── Overlays ─────────────────────────────────────────────────────────────
      const s     = statsRef.current;
      const total = (s.S || 0) + (s.I || 0) + (s.M || 0) + (s.R || 0) || 1;
      drawGlobe(ctx, (s.M || 0) / total);
      drawDateStamp(ctx, W, s.tick || 0);
      drawLegend(ctx, W, H, s);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [simRef]);

  const onMouseMove = useCallback(e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scX  = canvas.width  / canvas.offsetWidth;
    const scY  = canvas.height / canvas.offsetHeight;
    const mx   = (e.clientX - rect.left) * scX;
    const my   = (e.clientY - rect.top)  * scY;

    const sim = simRef.current;
    if (!sim || !sim.agents.length) return;

    const W = canvas.width, H = canvas.height;
    let closest = null, minD = 16;
    for (const a of sim.agents) {
      const [ax, ay] = project(a.lat, a.lon, W, H);
      const d = Math.hypot(ax - mx, ay - my);
      if (d < minD) { minD = d; closest = a; }
    }
    hoverRef.current = closest;

    const tip = tooltipRef.current;
    if (!tip) return;
    if (closest) {
      const cx = (e.clientX - rect.left) + 14;
      const cy = (e.clientY - rect.top)  - 10;
      tip.style.display = 'block';
      tip.style.left    = `${cx}px`;
      tip.style.top     = `${cy}px`;
      const zStr  = typeof closest.lastZ === 'number' ? closest.lastZ.toFixed(2) : '—';
      const nPct  = Math.round((closest.N_i ?? 0) * 100);
      const dPct  = Math.round((closest.D_i ?? 0) * 100);
      tip.innerHTML = `
        <div class="tt-r"><span class="tt-k">Agent</span><span class="tt-v">#${closest.id}</span></div>
        <div class="tt-r"><span class="tt-k">Region</span><span class="tt-v">${closest.region.name}</span></div>
        <div class="tt-r"><span class="tt-k">State</span><span class="tt-v" style="color:${SC[closest.state]}">${closest.state}</span></div>
        <div class="tt-r"><span class="tt-k">Z-score</span><span class="tt-v">${zStr}</span></div>
        <div class="tt-r"><span class="tt-k">Ngbr mig</span><span class="tt-v">${nPct}%</span></div>
        <div class="tt-r"><span class="tt-k">Ngbr int</span><span class="tt-v">${dPct}%</span></div>
      `;
    } else {
      tip.style.display = 'none';
    }
  }, [simRef]);

  const onMouseLeave = useCallback(() => {
    hoverRef.current = null;
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
  }, []);

  return (
    <div className="canvas-wrap">
      <canvas
        ref={canvasRef}
        className="sim-canvas"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      />
      <div className="scanlines" />
      <div ref={tooltipRef} className="agent-tip" style={{ display: 'none' }} />
    </div>
  );
}
