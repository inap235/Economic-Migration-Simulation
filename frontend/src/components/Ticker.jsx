export default function Ticker({ stats }) {
  const total = (stats.S || 0) + (stats.I || 0) + (stats.M || 0) + (stats.R || 0) || 1;
  const mPct  = ((stats.M || 0) / total * 100).toFixed(1);
  const iPct  = ((stats.I || 0) / total * 100).toFixed(1);

  const seg = [
    `MIGRATED  ${stats.M || 0}  (${mPct}%)`,
    `INTENT  ${stats.I || 0}  (${iPct}%)`,
    `STAYING  ${stats.S || 0}`,
    `RETURNED  ${stats.R || 0}`,
    `TICK  T+${stats.tick || 0}`,
    `MOLDOVA  ECONOMIC MIGRATION DYNAMICS`,
    `AGENT-BASED MODEL  ·  2000 AGENTS  ·  SIMR STATE MACHINE`,
    `WAGE GAP  ·  TIKTOK PRESSURE  ·  NETWORK DIFFUSION  ·  COGNITIVE BIAS`,
  ].join('    ◆    ');

  // Duplicate text so marquee loops seamlessly
  const content = `${seg}    ◆    ${seg}`;

  return (
    <div className="ticker-bar">
      <div className="ticker-label">LIVE</div>
      <div className="ticker-wrap">
        <div className="ticker-track">{content}</div>
      </div>
    </div>
  );
}
