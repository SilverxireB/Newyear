// 🎄 Yılbaşı teması dekoru: üstte sıcak yanıp sönen ışık dizisi + arka planda
// bulanık sıcak ışık parıltıları (ağaç ışığı hissi). Tamamen dekoratif.
export default function NoelDecor() {
  const colors = ['#ffd98a', '#ff5a5f', '#4ade80', '#fff1c9', '#ffb703', '#ef4444']
  const bulbs = Array.from({ length: 28 }, (_, i) => ({
    c: colors[i % colors.length],
    d: `${(i % 7) * 0.18}s`,
  }))
  const bokeh = [
    { l: '12%', t: '20%', s: 130, c: '#ffca6a' },
    { l: '82%', t: '26%', s: 160, c: '#ff8f8f' },
    { l: '48%', t: '54%', s: 190, c: '#ffd98a' },
    { l: '22%', t: '72%', s: 140, c: '#7be29a' },
    { l: '88%', t: '66%', s: 120, c: '#ffb703' },
    { l: '60%', t: '84%', s: 150, c: '#ff6b6b' },
  ]

  return (
    <>
      {/* Bulanık sıcak ışıklar (arka plan) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {bokeh.map((b, i) => (
          <span
            key={i}
            className="noel-bokeh"
            style={{ left: b.l, top: b.t, width: b.s, height: b.s, background: b.c, animationDelay: `${i * 0.7}s` }}
          />
        ))}
      </div>

      {/* Üstte sıcak ışık dizisi */}
      <div className="noel-lights pointer-events-none fixed top-0 inset-x-0 z-30" aria-hidden="true">
        <div className="noel-wire" />
        <div className="noel-row">
          {bulbs.map((b, i) => (
            <span key={i} className="noel-bulb" style={{ '--c': b.c, animationDelay: b.d }} />
          ))}
        </div>
      </div>

      <style>{`
        .noel-bokeh {
          position: absolute;
          border-radius: 9999px;
          filter: blur(28px);
          opacity: 0.22;
          transform: translate(-50%, -50%);
          animation: noelGlow 4.5s ease-in-out infinite;
        }
        @keyframes noelGlow {
          0%, 100% { opacity: 0.14; transform: translate(-50%, -50%) scale(0.9); }
          50% { opacity: 0.32; transform: translate(-50%, -50%) scale(1.08); }
        }
        .noel-lights { height: 22px; }
        .noel-wire {
          position: absolute; top: 3px; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent);
        }
        .noel-row { position: relative; display: flex; justify-content: space-around; padding: 0 4px; }
        .noel-bulb {
          width: 8px; height: 11px; border-radius: 50% 50% 45% 45%;
          background: var(--c);
          box-shadow: 0 0 8px 1px var(--c);
          transform: translateY(3px);
          animation: noelTwinkle 2.2s ease-in-out infinite;
        }
        @keyframes noelTwinkle {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 5px 0 var(--c); }
          50% { opacity: 1; box-shadow: 0 0 12px 3px var(--c); }
        }
        @media (prefers-reduced-motion: reduce) {
          .noel-bokeh { animation: none; opacity: 0.2; }
          .noel-bulb { animation: none; opacity: 0.95; }
        }
      `}</style>
    </>
  )
}
