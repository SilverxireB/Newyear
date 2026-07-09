// 🎄 Yılbaşı teması dekoru: arka planda yumuşak, bulanık sıcak ışık parıltıları
// (odaklanmamış ağaç ışığı hissi). Göze batmadan sıcaklık verir.
export default function NoelDecor() {
  const bokeh = [
    { l: '12%', t: '20%', s: 130, c: '#ffca6a' },
    { l: '82%', t: '26%', s: 160, c: '#ff8f8f' },
    { l: '48%', t: '54%', s: 190, c: '#ffd98a' },
    { l: '22%', t: '72%', s: 140, c: '#7be29a' },
    { l: '88%', t: '66%', s: 120, c: '#ffb703' },
    { l: '60%', t: '84%', s: 150, c: '#ff6b6b' },
  ]

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {bokeh.map((b, i) => (
        <span
          key={i}
          className="noel-bokeh"
          style={{ left: b.l, top: b.t, width: b.s, height: b.s, background: b.c, animationDelay: `${i * 0.7}s` }}
        />
      ))}
      <style>{`
        .noel-bokeh {
          position: absolute;
          border-radius: 9999px;
          filter: blur(30px);
          opacity: 0.2;
          transform: translate(-50%, -50%);
          animation: noelGlow 5s ease-in-out infinite;
        }
        @keyframes noelGlow {
          0%, 100% { opacity: 0.12; transform: translate(-50%, -50%) scale(0.9); }
          50% { opacity: 0.28; transform: translate(-50%, -50%) scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          .noel-bokeh { animation: none; opacity: 0.18; }
        }
      `}</style>
    </div>
  )
}
