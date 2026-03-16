import { useRef, useState, useEffect, useCallback } from 'react';
import { Simulation } from './simulation/Simulation.js';
import { DEFAULT_SLIDERS, N_AGENTS, TICK_MS, SPAWN_BATCH, SPAWN_INTERVAL } from './config.js';
import LeftPanel  from './components/LeftPanel.jsx';
import SimCanvas  from './components/SimCanvas.jsx';
import EventFeed  from './components/EventFeed.jsx';
import Ticker     from './components/Ticker.jsx';
import './styles/main.css';
import './styles/panels.css';
import './styles/animations.css';

export default function App() {
  const simRef = useRef(null);

  const [sliders, setSliders] = useState(DEFAULT_SLIDERS);
  const [stats,   setStats]   = useState({ S: N_AGENTS, I: 0, M: 0, R: 0, tick: 0 });
  const [events,  setEvents]  = useState([]);
  const [running, setRunning] = useState(false);
  // 'intro' → 'spawning' → 'running'
  const [phase,   setPhase]   = useState('intro');

  // Create simulation instance on mount; transition out of intro after 2.8 s
  useEffect(() => {
    simRef.current = new Simulation(DEFAULT_SLIDERS);
    const t = setTimeout(() => setPhase('spawning'), 2800);
    return () => clearTimeout(t);
  }, []);

  // Batch-spawn agents every SPAWN_INTERVAL ms
  useEffect(() => {
    if (phase !== 'spawning') return;
    const iv = setInterval(() => {
      const done = simRef.current.spawnBatch(SPAWN_BATCH);
      // Keep stats state in sync so canvas gets repaint signal
      setStats(simRef.current.getStats());
      if (done) {
        clearInterval(iv);
        setTimeout(() => { setPhase('running'); setRunning(true); }, 300);
      }
    }, SPAWN_INTERVAL);
    return () => clearInterval(iv);
  }, [phase]);

  // Main simulation tick loop
  useEffect(() => {
    if (!running || phase !== 'running') return;
    const iv = setInterval(() => {
      const { stats: s, newEvents } = simRef.current.tick();
      setStats(s);
      if (newEvents.length > 0) {
        setEvents(prev => [...prev, ...newEvents].slice(-20));
      }
    }, TICK_MS);
    return () => clearInterval(iv);
  }, [running, phase]);

  const handleSlider = useCallback((key, val) => {
    setSliders(prev => {
      const next = { ...prev, [key]: val };
      simRef.current?.updateSliders(next);
      return next;
    });
  }, []);

  const handleRunPause = useCallback(() => setRunning(r => !r), []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setEvents([]);
    setPhase('spawning');
    simRef.current?.reset(sliders);
  }, [sliders]);

  const history = simRef.current?.history ?? [];

  return (
    <div className="app-root">
      {phase === 'intro' && <IntroOverlay />}

      <div className="main-layout">
        <LeftPanel
          stats={stats}
          sliders={sliders}
          onSliderChange={handleSlider}
          onRunPause={handleRunPause}
          onReset={handleReset}
          running={running}
          history={history}
        />
        <SimCanvas simRef={simRef} stats={stats} />
        <EventFeed events={events} />
      </div>

      <Ticker stats={stats} />
    </div>
  );
}

function IntroOverlay() {
  return (
    <div className="intro-overlay">
      <div className="intro-content">
        <div className="intro-title">MOLDOVA</div>
        <div className="intro-subtitle">Economic Migration Dynamics · Agent-Based Model</div>
        <div className="intro-bar" />
      </div>
    </div>
  );
}
