import { Agent } from './Agent.js';
import { N_AGENTS } from '../config.js';

const sigmoid = x => 1 / (1 + Math.exp(-x));

function getChannel(agent, N_i) {
  if (N_i > 0.3)                       return 'family';
  if (agent.tiktok_influence > 0.3)    return 'tiktok';
  if (agent.fb_influence > 0.15)       return 'facebook';
  return 'wage';
}

export class Simulation {
  constructor(sliders) {
    this.sliders    = { ...sliders };
    this.agents     = [];
    this.tick_count = 0;
    this.history    = [];
    this.spawned    = 0;
  }

  /** Spawn `count` agents; returns true when all N_AGENTS are spawned. */
  spawnBatch(count) {
    const end = Math.min(this.spawned + count, N_AGENTS);
    for (let i = this.spawned; i < end; i++) this.agents.push(new Agent(i));
    this.spawned = end;
    if (this.spawned >= N_AGENTS) this._buildNetwork();
    return this.spawned >= N_AGENTS;
  }

  _buildNetwork() {
    const n = this.agents.length;
    for (const agent of this.agents) {
      const nConns = 3 + Math.floor(Math.random() * 6); // 3–8 connections
      const set    = new Set();
      let   tries  = 0;
      while (set.size < nConns && tries < 80) {
        const idx = Math.floor(Math.random() * n);
        if (idx !== agent.id) set.add(idx);
        tries++;
      }
      agent.connections = Array.from(set);
    }
  }

  _networkInfluence(agent) {
    if (!agent.connections.length) return 0;
    let active = 0;
    for (const idx of agent.connections) {
      const c = this.agents[idx];
      if (c && (c.state === 'I' || c.state === 'M')) active++;
    }
    return active / agent.connections.length;
  }

  _updateSocialPressure() {
    for (const a of this.agents) a.social_pressure = this._networkInfluence(a);
  }

  tick() {
    const n = this.agents.length;
    if (!n) return { stats: { S: 0, I: 0, M: 0, R: 0, tick: 0 }, newEvents: [] };

    // Diaspora fraction for D_i
    let mCount = 0;
    for (const a of this.agents) if (a.state === 'M') mCount++;
    const D_global = mCount / n;

    this._updateSocialPressure();

    const newEvents = [];

    for (const agent of this.agents) {
      // Decay halo
      agent.halo = Math.max(0, agent.halo - 0.08);

      const N_i = agent.social_pressure;

      if (agent.state === 'S') {
        const Z = agent.computeZ(this.sliders, N_i, D_global);
        // P(S→I) = sigmoid(Z – threshold×0.4) × 0.02
        if (Math.random() < sigmoid(Z - agent.threshold * 0.4) * 0.02) {
          agent.state = 'I';
          agent.halo  = 1.0;
          const channel = getChannel(agent, N_i);
          agent.transitionChannel = channel;
          newEvents.push({
            id: `${this.tick_count}-${agent.id}`,
            type: 'S→I', agentId: agent.id,
            region: agent.region.name, channel,
            Z: Z.toFixed(2), neighborPct: Math.round(N_i * 100),
          });
        }

      } else if (agent.state === 'I') {
        const Z = agent.computeZ(this.sliders, N_i, D_global);
        // P(I→M) = sigmoid(0.3 + 0.8Z + 0.5N_i) × 0.05
        if (Math.random() < sigmoid(0.3 + 0.8 * Z + 0.5 * N_i) * 0.05) {
          agent.state = 'M';
          agent.halo  = 1.0;
          const channel = getChannel(agent, N_i);
          agent.transitionChannel = channel;
          newEvents.push({
            id: `${this.tick_count}-${agent.id}`,
            type: 'I→M', agentId: agent.id,
            region: agent.region.name, channel,
            Z: Z.toFixed(2), neighborPct: Math.round(N_i * 100),
          });
        }

      } else if (agent.state === 'M') {
        // P(M→R) = sigmoid(–1 + 0.6×f_home – 0.4×abroad_adapt) × 0.008
        if (Math.random() < sigmoid(-1 + 0.6 * agent.f_home - 0.4 * agent.abroad_adapt) * 0.008) {
          agent.state = 'R';
          agent.halo  = 0.8;
          newEvents.push({
            id: `${this.tick_count}-${agent.id}`,
            type: 'M→R', agentId: agent.id,
            region: agent.region.name, channel: 'return',
            Z: '—', neighborPct: 0,
          });
        }

      } else if (agent.state === 'R') {
        // P(R→S) = 0.01
        if (Math.random() < 0.01) {
          agent.state = 'S';
          agent.halo  = 0.4;
        }
      }
    }

    const counts = { S: 0, I: 0, M: 0, R: 0 };
    for (const a of this.agents) counts[a.state]++;

    this.tick_count++;
    this.history.push({ ...counts, tick: this.tick_count });
    if (this.history.length > 300) this.history.shift();

    return { stats: { ...counts, tick: this.tick_count }, newEvents: newEvents.slice(0, 5) };
  }

  getStats() {
    const counts = { S: 0, I: 0, M: 0, R: 0 };
    for (const a of this.agents) counts[a.state]++;
    return { ...counts, tick: this.tick_count };
  }

  updateSliders(s) { this.sliders = { ...s }; }

  reset(sliders) {
    this.sliders    = { ...sliders };
    this.agents     = [];
    this.tick_count = 0;
    this.history    = [];
    this.spawned    = 0;
  }
}
