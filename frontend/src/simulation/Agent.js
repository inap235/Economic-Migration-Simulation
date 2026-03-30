import { REGIONS } from '../config.js';
import { exitFor, zoneFor } from './MapData.js';

// ── Movement constants ────────────────────────────────────────────────────────
const SPEED_BROWNIAN = 0.0018; // degrees/tick — Brownian noise amplitude
const SPEED_DRIFT    = 0.0095; // degrees/tick — directed drift speed (I state toward border)
const SPEED_RETURN   = 0.0110; // degrees/tick — return drift speed (R state toward home)
const DAMPING        = 0.90;   // velocity damping — keeps motion smooth and bounded
const HOME_PULL      = 0.0030; // attraction coefficient pulling S-agents toward home region centroid

export class Agent {
  constructor(id) {
    this.id = id;

    // ── Region assignment (weighted draw) ─────────────────────────────────────
    let cum = 0;
    const r = Math.random();
    this.region = REGIONS[REGIONS.length - 1];
    for (const region of REGIONS) {
      cum += region.weight;
      if (r <= cum) { this.region = region; break; }
    }

    // ── Initial position: uniform radial scatter inside region ─────────────────
    // sqrt(Math.random()) gives a uniform distribution over a disk (not clustered center)
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.sqrt(Math.random()) * this.region.spread;
    this.lat    = this.region.lat + Math.cos(angle) * dist;
    this.lon    = this.region.lon + Math.sin(angle) * dist * 1.6; // lon degrees are wider visually

    // ── Velocity (degrees/tick) ────────────────────────────────────────────────
    this.vLat = (Math.random() - 0.5) * SPEED_BROWNIAN * 2;
    this.vLon = (Math.random() - 0.5) * SPEED_BROWNIAN * 2;

    // ── Economic parameters (normalised so wage_diff drives Z into a useful range) ─
    this.w_loc  = (280  + Math.random() * 420)  / 1000; // Moldova wage  ≈ 0.28–0.70
    this.w_ext  = (1400 + Math.random() * 2200) / 1000; // EU/UK wage    ≈ 1.40–3.60
    this.cost   = 0.18 + Math.random() * 0.82;          // one-time migration cost (normalised)

    // ── Psychological parameters ───────────────────────────────────────────────
    this.bias_opt     = 0.05 + Math.random() * 0.45;  // δ: optimism multiplier on w_ext
    this.bias_surv    = Math.random() * 0.60;          // survivorship bias magnitude
    this.f_home       = Math.random();                 // homesickness 0–1
    this.abroad_adapt = Math.random();                 // abroad adaptation 0–1
    this.threshold    = -0.5 + Math.random() * 1.5;   // personal decision threshold

    // ── Media sensitivity ──────────────────────────────────────────────────────
    this.fb_influence     = Math.random() * 0.30;
    this.tiktok_influence = Math.random() * 0.50;

    // ── Network influence (written by Simulation._updateNetworkInfluence each tick) ─
    this.N_i         = 0;  // fraction of connections in state M (diaspora pull)
    this.D_i         = 0;  // fraction of connections in state I (peer contagion)
    this.connections = [];

    // ── SIMR state machine ─────────────────────────────────────────────────────
    this.state             = 'S';
    this.halo              = 0;     // 0–1, decays per tick; drives flash halo in renderer
    this.transitionChannel = null;
    this.lastZ             = 0;     // Z-score from last computeZ call; used by tooltip

    // ── Movement metadata ──────────────────────────────────────────────────────
    this.migDir         = null;   // 'west' | 'east', assigned on S→I transition
    this.nearBorder     = false;  // true when within BORDER_PROXIMITY_DEG of exit point
    this.targetLifeCost = null;   // 0..1 normalized cost at destination
  }

  /**
   * Compute the migration utility score Z for this agent.
   *
   * Formula (all coefficients per original spec):
   *   Z = -1.2
   *     + 2.5 × (w_ext×(1+δ) – w_loc) × wageGap        [wage differential]
   *     – 1.8 × cost × migrationCost                     [migration cost]
   *     + 1.5 × (N_i + D_i) × networkStrength           [aggregate social pressure]
   *     + 2.0 × N_i                                      [diaspora pull from migrated neighbors]
   *     + 1.2 × D_i                                      [peer contagion from intending neighbors]
   *     + 0.9 × TT_i                                     [TikTok influence signal]
   *     + 0.8 × bias_surv                                [survivorship bias]
   *
   * N_i and D_i are pre-computed by Simulation._updateNetworkInfluence() and
   * stored on the agent, avoiding redundant iteration in the hot path.
   *
   * The `social_pressure` term (1.5 × (N_i + D_i)) captures aggregate neighbourhood
   * activity; the 2.0 × N_i and 1.2 × D_i terms capture the directional effects
   * (diaspora pull vs. peer contagion) separately, as modelled in the spec.
   */
  computeZ(sliders) {
    const delta           = this.bias_opt * sliders.cognitiveBias;
    const w_ext_adj       = this.w_ext * (1 + delta);
    const TT_i            = this.tiktok_influence * sliders.tiktokPressure;
    const social_pressure = (this.N_i + this.D_i) * sliders.networkStrength;

    const targetLifeCost = this.targetLifeCost ?? 0.62; // Moldova baseline if unset
    const lifeCostFactor = targetLifeCost * sliders.lifeCost;
    const lifeCostTerm   = -1.8 * (lifeCostFactor - 0.60); // above 0.60 reduces migration utility

    const z = -1.2
      + 2.5 * (w_ext_adj - this.w_loc) * sliders.wageGap
      - 1.8 * this.cost                * sliders.migrationCost
      + 1.5 * social_pressure
      + 2.0 * this.N_i
      + 1.2 * this.D_i
      + 0.9 * TT_i
      + 0.8 * this.bias_surv
      + lifeCostTerm;

    this.lastZ = z;
    return z;
  }

  /**
   * Update position for one tick. Called by Simulation.tick() after state transitions.
   *
   *   S → Brownian motion anchored softly to home region centroid
   *   I → directed drift toward border exit + Brownian noise; slows near border (clustering)
   *   M → light Brownian drift in external emigrant zone (already positioned there)
   *   R → directed return toward home region; switches to Brownian once near home
   */
  move() {
    switch (this.state) {
      case 'S': this._moveS(); break;
      case 'I': this._moveI(); break;
      case 'M': this._moveM(); break;
      case 'R': this._moveR(); break;
    }
    this.lat += this.vLat;
    this.lon += this.vLon;
  }

  _moveS() {
    this.vLat += (Math.random() - 0.5) * SPEED_BROWNIAN;
    this.vLon += (Math.random() - 0.5) * SPEED_BROWNIAN;
    this.vLat *= DAMPING;
    this.vLon *= DAMPING;
    // Soft pull toward home region centroid — prevents agents drifting off-region
    this.vLat += (this.region.lat - this.lat) * HOME_PULL;
    this.vLon += (this.region.lon - this.lon) * HOME_PULL;
  }

  _moveI() {
    if (!this.migDir) { this._moveS(); return; }
    const exit = exitFor(this.migDir);
    const dLat = exit.lat - this.lat;
    const dLon = exit.lon - this.lon;
    const dist = Math.hypot(dLat, dLon) + 1e-6;

    this.nearBorder = dist < 0.32;
    // Slow to a near-stop once at border — produces visible waiting clusters
    const speed = this.nearBorder ? SPEED_DRIFT * 0.18 : SPEED_DRIFT;
    this.vLat = (dLat / dist) * speed + (Math.random() - 0.5) * SPEED_BROWNIAN;
    this.vLon = (dLon / dist) * speed + (Math.random() - 0.5) * SPEED_BROWNIAN;
  }

  _moveM() {
    // Gentle drift inside the external zone; no strong attractor
    this.vLat = (Math.random() - 0.5) * SPEED_BROWNIAN * 0.55;
    this.vLon = (Math.random() - 0.5) * SPEED_BROWNIAN * 0.55;
  }

  _moveR() {
    const dLat = this.region.lat - this.lat;
    const dLon = this.region.lon - this.lon;
    const dist = Math.hypot(dLat, dLon) + 1e-6;
    if (dist > 0.10) {
      this.vLat = (dLat / dist) * SPEED_RETURN;
      this.vLon = (dLon / dist) * SPEED_RETURN;
    } else {
      // Near home — resume Brownian + home pull
      this.vLat += (Math.random() - 0.5) * SPEED_BROWNIAN;
      this.vLon += (Math.random() - 0.5) * SPEED_BROWNIAN;
      this.vLat *= DAMPING;
      this.vLon *= DAMPING;
    }
  }

  /**
   * Teleport agent into the external emigrant zone matching their migration direction.
   * Called once on I → M transition. Resets velocity to zero (agent "arrives").
   */
  placeInExternalZone() {
    const zone  = zoneFor(this.migDir ?? 'west');
    const angle = Math.random() * Math.PI * 2;
    const r     = Math.sqrt(Math.random()) * zone.spread;
    this.lat    = zone.latC + Math.cos(angle) * r;
    this.lon    = zone.lonC + Math.sin(angle) * r * 1.3;
    this.vLat   = 0;
    this.vLon   = 0;
  }
}
