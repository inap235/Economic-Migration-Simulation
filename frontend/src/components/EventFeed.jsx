const ICONS    = { family: '👨‍👩‍👧', facebook: '📘', tiktok: '🎵', wage: '💰', return: '🏠' };
const T_COLORS = { 'S→I': '#F5A623', 'I→M': '#E74C3C', 'M→R': '#2ECC71', 'R→S': '#2ECC71' };

export default function EventFeed({ events }) {
  return (
    <aside className="right-panel">
      <header className="feed-header">
        <span className="feed-title">Signal Feed</span>
        <span className="feed-live">● LIVE</span>
      </header>

      <div className="feed-list">
        {events.length === 0 && (
          <div className="feed-empty">Waiting for transitions…</div>
        )}
        {[...events].reverse().map(ev => {
          const isBig = ev.neighborPct >= 60 || ev.Z >= 1.3;
          return (
            <div
              key={ev.id}
              className="feed-item"
              style={{
                background: isBig ? 'rgba(231, 76, 60, 0.12)' : 'transparent',
                borderLeft: `3px solid ${T_COLORS[ev.type] || '#888'}`,
              }}
            >
              <div className="feed-top">
                <span className="feed-icon">{ICONS[ev.channel] ?? '◆'}</span>
                <span className="feed-type" style={{ color: T_COLORS[ev.type] }}>{ev.type}</span>
                <span className="feed-region">{ev.region}</span>
              </div>
              <div className="feed-meta">
                <span className="feed-z">Z={ev.Z}</span>
                <span className="feed-nb">{ev.neighborPct}% ngbr</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
