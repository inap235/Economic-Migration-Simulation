import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const API_URL = 'http://localhost:8000/simulate';

const initialParams = {
  n_agents: 500,
  steps: 60,
  seed: 42,
  wage_local_mean: 700,
  wage_external_mean: 1900,
  migration_cost_mean: 420,
  network_edge_prob: 0.03,
  media_facebook_mean: 0.55,
  media_tiktok_mean: 0.45,
  optimism_delta_mean: 0.16,
  initial_intent_fraction: 0.05,
  initial_migrated_fraction: 0.02
};

const stateColors = {
  S: '#0f4c5c',
  I: '#fb8b24',
  M: '#2a9d8f',
  R: '#9a8c98'
};

function NumberField({ label, name, value, min, max, step, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        name={name}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(name, Number(event.target.value))}
      />
    </label>
  );
}

export default function App() {
  const [params, setParams] = useState(initialParams);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const pieData = useMemo(() => {
    if (!result?.final_counts) {
      return [];
    }
    return Object.entries(result.final_counts).map(([name, value]) => ({
      name,
      value,
      fill: stateColors[name]
    }));
  }, [result]);

  const mergedDiffusion = useMemo(() => {
    if (!result?.history || !result?.macro_diffusion) {
      return [];
    }

    return result.history.map((row, idx) => ({
      t: row.t,
      agent_m: row.m_share,
      macro_m: result.macro_diffusion[idx]?.m ?? null
    }));
  }, [result]);

  const updateParam = (name, value) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const runSimulation = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || 'Simulation request failed.');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Unexpected error while running simulation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <p className="kicker">Economic Migration</p>
        <h1>Agent-Based Simulation Dashboard</h1>
        <p className="subtitle">
          Simulate how wage gaps, social pressure, diaspora networks, media channels, and cognitive bias
          can propagate migration decisions.
        </p>
      </header>

      <main className="layout">
        <section className="panel controls">
          <h2>Model Parameters</h2>
          <div className="grid">
            <NumberField label="Agents" name="n_agents" value={params.n_agents} min={50} max={5000} step={50} onChange={updateParam} />
            <NumberField label="Steps" name="steps" value={params.steps} min={10} max={300} step={5} onChange={updateParam} />
            <NumberField label="Seed" name="seed" value={params.seed} min={0} max={99999} step={1} onChange={updateParam} />

            <NumberField label="Local wage mean" name="wage_local_mean" value={params.wage_local_mean} min={100} max={5000} step={10} onChange={updateParam} />
            <NumberField label="External wage mean" name="wage_external_mean" value={params.wage_external_mean} min={100} max={10000} step={10} onChange={updateParam} />
            <NumberField label="Migration cost mean" name="migration_cost_mean" value={params.migration_cost_mean} min={50} max={5000} step={10} onChange={updateParam} />

            <NumberField label="Network edge probability" name="network_edge_prob" value={params.network_edge_prob} min={0.001} max={0.5} step={0.005} onChange={updateParam} />
            <NumberField label="Facebook influence" name="media_facebook_mean" value={params.media_facebook_mean} min={0} max={1} step={0.01} onChange={updateParam} />
            <NumberField label="TikTok influence" name="media_tiktok_mean" value={params.media_tiktok_mean} min={0} max={1} step={0.01} onChange={updateParam} />

            <NumberField label="Optimism bias" name="optimism_delta_mean" value={params.optimism_delta_mean} min={0} max={1} step={0.01} onChange={updateParam} />
            <NumberField label="Initial intent share" name="initial_intent_fraction" value={params.initial_intent_fraction} min={0} max={0.5} step={0.01} onChange={updateParam} />
            <NumberField label="Initial migrated share" name="initial_migrated_fraction" value={params.initial_migrated_fraction} min={0} max={0.5} step={0.01} onChange={updateParam} />
          </div>

          <button onClick={runSimulation} disabled={loading} className="run-button">
            {loading ? 'Running simulation...' : 'Run simulation'}
          </button>

          {error && <p className="error">{error}</p>}
        </section>

        <section className="panel charts">
          <h2>Simulation Output</h2>
          {!result && <p className="placeholder">Run the simulation to generate charts.</p>}

          {result && (
            <>
              <div className="metrics">
                <div>
                  <span>Final migration share</span>
                  <strong>{(result.summary.final_migration_share * 100).toFixed(1)}%</strong>
                </div>
                <div>
                  <span>Final diaspora share</span>
                  <strong>{(result.summary.final_diaspora_share * 100).toFixed(1)}%</strong>
                </div>
                <div>
                  <span>Avg local wage</span>
                  <strong>{result.summary.avg_local_wage.toFixed(0)}</strong>
                </div>
                <div>
                  <span>Avg external wage</span>
                  <strong>{result.summary.avg_external_wage.toFixed(0)}</strong>
                </div>
              </div>

              <div className="chart-wrap">
                <h3>Agent States Over Time</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={result.history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="t" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="S" stroke={stateColors.S} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="I" stroke={stateColors.I} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="M" stroke={stateColors.M} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="R" stroke={stateColors.R} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-wrap two-col">
                <div>
                  <h3>Final State Composition</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Tooltip />
                      <Pie dataKey="value" data={pieData} outerRadius={100} label />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3>Agent vs Macro Diffusion m(t)</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={mergedDiffusion}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" />
                      <YAxis domain={[0, 1]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="agent_m" stroke="#e76f51" strokeWidth={2} dot={false} name="Agent model m(t)" />
                      <Line type="monotone" dataKey="macro_m" stroke="#1d3557" strokeWidth={2} dot={false} name="Macro diffusion m(t)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
