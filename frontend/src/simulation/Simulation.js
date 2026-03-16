import { Agent } from './Agent.js';
import { assignMigDir } from './MapData.js';
import { N_AGENTS } from '../config.js';

const sigmoid = x => 1 / (1 + Math.exp(-x));

/**
 * Infer the dominant influence channel driving a migration transition.
 * Used to categorise signal-feed events in the UI.
 *
 * Priority: social network (N_i) > TikTok > Facebook > wage
 */
function getChannel(agent) {
  if (agent.N_i > 0.30)              return 'family';
  if (agent.tiktok_influence > 0.30) return 'tiktok';
  if (agent.fb_influence > 0.15)     return 'facebook';
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

  /** Spawn a batch of agents; returns true when all N_AGENTS are present. */
  spawnBatch(count) {
    const end = Math.min(this.spawned + count, N_AGENTS);
    for (let i = this.spawned; i < end; i++) this.agents.push(new Agent(i));
    this.spawned = end;
    if (this.spawned >= N_AGENTS) this._buildNetwork();
    return this.spawned >= N_AGENTS;
  }

  /** Assign random adjacency lists (3–8 connections per agent). */
  _buildNetwork() {
    const n = this.agents.length;
    for (const agent of this.agents) {
      const nConns = 3 + Math.floor(Math.random() * 6);
      const set    = new Set();
      let   tries  = 0;
      while (set.size < nConns && tries < 100) {
        const idx = Math.floor(Math.random() * n);
        if (idx !== agent.id) set.add(idx);
        tries++;
      }
      agent.connections = Array.from(set);
    }
  }

  /**
   * Compute per-agent network influence and write directly onto each agent.
   *
   *   N_i — fraction of connections in state M (diaspora pull)
   *   D_i — fraction of connections in state I (peer contagion / intent diffusion)
   *
   * Storing on the agent keeps computeZ() side-effect-free and avoids passing
   * arguments through every call site. Called once at the top of each tick,
   * before any state transitions, so the network snapshot is internally consistent.
   */
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

  tick() {
    const n = this.agents.length;
    if (!n) return { stats: { S: 0, I: 0, M: 0, R: 0, tick: 0 }, newEvents: [] };

    // Snapshot network influence for all agents before evaluating any transitions.
    // This prevents cascade effects within a single tick.
    this._updateNetworkInfluence();

    const newEvents = [];

    for (const agent of this.agents) {
      agent.halo = Math.max(0, agent.halo - 0.08);

      if (agent.state === 'S') {
        const Z = agent.computeZ(this.sliders);
        // P(S→I) = sigmoid(Z – threshold × 0.4) × 0.02
        if (Math.random() < sigmoid(Z - agent.threshold * 0.4) * 0.02) {
          agent.state      = 'I';
          agent.halo       = 1.0;
          agent.migDir     = assignMigDir(agent);
          agent.nearBorder = false;
          const ch         = getChannel(agent);
          agent.transitionChannel = ch;
          newEvents.push({
            id: `${this.tick_count}-${agent.id}`,
            type: 'S→I', agentId: agent.id,
            region: agent.region.name, channel: ch,
            Z: Z.toFixed(2), neighborPct: Math.round(agent.N_i * 100),
          });
        }

      } else if (agent.state === 'I') {
        const Z = agent.computeZ(this.sliders);
        // P(I→M) = sigmoid(0.3 + 0.8Z + 0.5N_i) × 0.05
        if (Math.random() < sigmoid(0.3 + 0.8 * Z + 0.5 * agent.N_i) * 0.05) {
          agent.state = 'M';
          agent.halo  = 1.0;
          agent.placeInExternalZone();
          const ch = getChannel(agent);
          agent.transitionChannel = ch;
          newEvents.push({
            id: `${this.tick_count}-${agent.id}`,
            type: 'I→M', agentId: agent.id,
            region: agent.region.name, channel: ch,
            Z: Z.toFixed(2), neighborPct: Math.round(agent.N_i * 100),
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
          agent.state      = 'S';
          agent.halo       = 0.4;
          agent.migDir     = null;
          agent.nearBorder = false;
        }
      }

      // Update geographical position every tick (independent of state transitions)
      agent.move();
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
