import { useRef, useEffect } from 'react';

export default function MiniChart({ history }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(7,11,20,0.6)';
    ctx.fillRect(0, 0, W, H);

    const slice = history.slice(-60);
    if (slice.length < 2) {
      ctx.font      = '9px "IBM Plex Mono",monospace';
      ctx.fillStyle = 'rgba(58,66,88,0.8)';
      ctx.fillText('waiting for data…', 6, H / 2 + 4);
      return;
    }

    const data = slice.map(h => {
      const tot = (h.S || 0) + (h.I || 0) + (h.M || 0) + (h.R || 0) || 1;
      return (h.M || 0) / tot * 100;
    });

    const maxV = Math.max(...data, 5);
    const pts  = data.map((v, i) => [
      2 + (i / (data.length - 1)) * (W - 4),
      H - 6 - (v / maxV) * (H - 14),
    ]);

    // Area fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   'rgba(231,76,60,0.38)');
    grad.addColorStop(1,   'rgba(231,76,60,0.02)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], H);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(pts[pts.length - 1][0], H);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = '#E74C3C';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();

    // Labels
    ctx.font      = '9px "IBM Plex Mono",monospace';
    ctx.fillStyle = 'rgba(232,228,217,0.38)';
    ctx.fillText('M%', 3, 12);
    ctx.fillStyle = '#E74C3C';
    ctx.textAlign = 'right';
    ctx.fillText(`${data[data.length - 1].toFixed(1)}%`, W - 2, 12);
    ctx.textAlign = 'left';
  }, [history]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={64}
      style={{ width: '100%', height: '64px', borderRadius: '2px', display: 'block' }}
    />
  );
}
