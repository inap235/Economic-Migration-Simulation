import { useRef, useState, useEffect } from 'react';
import MiniChart from './MiniChart.jsx';
import AutomatonPanel from './AutomatonPanel.jsx';
import { COLORS } from '../config.js';

const SLIDER_DEFS = [
  { key: 'wageGap',         label: 'Wage Gap',           min: 0.5, max: 2.0, step: 0.05 },
  { key: 'tiktokPressure',  label: 'TikTok Pressure',    min: 0.0, max: 1.0, step: 0.05 },
  { key: 'migrationCost',   label: 'Migration Cost',     min: 0.5, max: 2.0, step: 0.05 },
  { key: 'networkStrength', label: 'Network Strength',   min: 0.5, max: 2.0, step: 0.05 },
  { key: 'cognitiveBias',   label: 'Cognitive Bias (δ)', min: 0.0, max: 1.0, step: 0.05 },
  { key: 'lifeCost',        label: 'Life Cost',          min: 0.5, max: 2.0, step: 0.05 },
];

const STATE_LABELS = { S: 'Staying', I: 'Intent', M: 'Migrated', R: 'Returned' };

/** Lerp-animated counter: visually interpolates toward `target`. */
function AnimCounter({ target, color }) {
  const [disp, setDisp] = useState(target);
  const curRef  = useRef(target);
  const rafRef  = useRef(null);

  useEffect(() => {
    const step = () => {
      const diff = target - curRef.current;
      if (Math.abs(diff) < 0.5) { curRef.current = target; setDisp(target); return; }
      curRef.current += diff * 0.14;
      setDisp(Math.round(curRef.current));
      rafRef.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return <span className="counter-val" style={{ color }}>{disp.toLocaleString()}</span>;
}

export default function LeftPanel({ stats, deltaM, sliderHint, showNetwork, onToggleNetwork, sliders, onSliderChange, onRunPause, onReset, running, history, transitionRates, eventsRef, particleTick }) {
  const total = (stats.S || 0) + (stats.I || 0) + (stats.M || 0) + (stats.R || 0) || 1;

  return (
    <aside className="left-panel">
      <header className="panel-header">
        <div className="panel-title">Moldova</div>
        <div className="panel-sub">Migration Simulator</div>
        <div className="panel-row info-row">
          <strong className="info-label">Δ Migrated</strong>
          <span className="info-value" style={{ color: deltaM >= 0 ? '#2ECC71' : '#E74C3C' }}>
            {deltaM >= 0 ? '+' : ''}{deltaM}
          </span>
        </div>
        <div className="panel-row info-row">
          <strong className="info-label">Life Cost</strong>
          <span className="info-value">{sliders.lifeCost.toFixed(2)}</span>
        </div>
        {sliderHint && (
          <div className="panel-row hint-row">Slider set: {sliderHint}</div>
        )}
        <div className="panel-rule" />
      </header>

      {/* ── State counters ── */}
      <section className="stat-grid">
        {['S', 'I', 'M', 'R'].map(st => (
          <div key={st} className="stat-cell" style={{ '--c': COLORS[st] }}>
            <div className="stat-label">{STATE_LABELS[st]}</div>
            <AnimCounter target={stats[st] || 0} color={COLORS[st]} />
            <div className="stat-bar">
              <div
                className="stat-bar-fill"
                style={{
                  width: `${((stats[st] || 0) / total * 100).toFixed(1)}%`,
                  background: COLORS[st],
                }}
              />
            </div>
            <div className="stat-pct" style={{ color: COLORS[st] }}>
              {((stats[st] || 0) / total * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </section>

      <div className="panel-rule" />

      {/* ── Sliders ── */}
      <section className="sliders-section">
        {SLIDER_DEFS.map(({ key, label, min, max, step }) => {
          const pct = ((sliders[key] - min) / (max - min) * 100).toFixed(1);
          return (
            <div key={key} className="slider-row">
              <div className="slider-labels">
                <span className="slider-label">{label}</span>
                <span className="slider-val">{sliders[key].toFixed(2)}</span>
              </div>
              <input
                type="range"
                className="diamond-slider"
                min={min} max={max} step={step}
                value={sliders[key]}
                style={{
                  background: `linear-gradient(to right,#F5A623 ${pct}%,rgba(58,66,88,0.55) ${pct}%)`,
                }}
                onChange={e => onSliderChange(key, parseFloat(e.target.value))}
              />
            </div>
          );
        })}
      </section>

      <div className="panel-rule" />

      {/* ── Controls ── */}
      <section className="btn-row">
        <button className="btn-primary" onClick={onRunPause}>
          {running ? '⏸ Pause' : '▶ Run'}
        </button>
        <button className="btn-primary" onClick={onToggleNetwork}>
          {showNetwork ? 'Hide net' : 'Show net'}
        </button>
        <button className="btn-ghost" onClick={onReset}>↺ Reset</button>
      </section>

      <div className="panel-rule" />

      {/* ── Sparkline ── */}
      <section className="minichart-section">
        <div className="minichart-label">Migrated % · last 60 ticks</div>
        <MiniChart history={history} />
      </section>

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

      <div className="panel-footer">
        T+{stats.tick || 0}
        &nbsp;·&nbsp;
        {2015 + Math.floor((stats.tick || 0) / 12)}
      </div>
    </aside>
  );
}
