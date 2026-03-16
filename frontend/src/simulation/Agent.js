import { REGIONS } from '../config.js';

export class Agent {
  constructor(id) {
    this.id = id;

    // Weighted region assignment
    const r = Math.random();
    let cum = 0;
    this.region = REGIONS[REGIONS.length - 1];
    for (const region of REGIONS) {
      cum += region.weight;
      if (r <= cum) { this.region = region; break; }
    }

    // Radial scatter around region centroid
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.sqrt(Math.random()) * this.region.spread; // sqrt for uniform disk
    this.lat = this.region.lat + Math.cos(angle) * dist;
    this.lon = this.region.lon + Math.sin(angle) * dist * 1.6;   // lon degrees are wider visually

    // Economic parameters (normalised to ~0–4 range for Z formula)
    this.w_loc  = (300  + Math.random() * 400)  / 1000; // Moldova wage  ~0.30–0.70
    this.w_ext  = (1500 + Math.random() * 2000) / 1000; // EU/UK wage    ~1.50–3.50
    this.cost   = 0.2   + Math.random() * 0.8;           // migration cost ~0.20–1.00

    // Psychological parameters
    this.bias_opt     = 0.05 + Math.random() * 0.45;  // δ optimism on w_ext_perceived
    this.bias_surv    = Math.random() * 0.6;           // survivorship bias
    this.f_home       = Math.random();                  // homesickness 0–1
    this.abroad_adapt = Math.random();                  // abroad adaptation 0–1
    this.threshold    = -0.5 + Math.random() * 1.5;   // personal decision threshold

    // Media channel sensitivity
    this.fb_influence     = Math.random() * 0.3;
    this.tiktok_influence = Math.random() * 0.5;

    // Runtime state (updated by Simulation)
    this.social_pressure = 0;
    this.connections     = [];

    // SIMR state
    this.state             = 'S';
    this.halo              = 0;     // 0–1, decays each tick; drives flash animation
    this.transitionChannel = null;
  }

  /**
   * Z = -1.2 + 2.5(w_ext×(1+δ) – w_loc) – 1.8×cost + 1.5×social_pressure
   *         + 2.0×N_i + 1.2×D_i + 0.9×TT_i + 0.8×bias_surv
   */
  computeZ(sliders, N_i, D_i) {
    const w_ext_perceived = this.w_ext * (1 + this.bias_opt * sliders.cognitiveBias);
    const wage_diff       = w_ext_perceived - this.w_loc;

    return -1.2
      + 2.5 * wage_diff                          * sliders.wageGap
      - 1.8 * this.cost                          * sliders.migrationCost
      + 1.5 * this.social_pressure               * sliders.networkStrength
      + 2.0 * N_i
      + 1.2 * D_i
      + 0.9 * this.tiktok_influence              * sliders.tiktokPressure
      + 0.8 * this.bias_surv;
  }
}
