// Hafif, dekoratif havai fişek arka planı (CSS animasyonlu, performans dostu).
export default function Fireworks() {
  const bursts = [
    { left: '15%', top: '20%', delay: '0s', color: '#f7d066' },
    { left: '80%', top: '15%', delay: '1.2s', color: '#ef5a78' },
    { left: '50%', top: '30%', delay: '2.1s', color: '#60a5fa' },
    { left: '30%', top: '10%', delay: '3s', color: '#4ade80' },
  ]
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden="true">
      {bursts.map((b, i) => (
        <span
          key={i}
          className="fw"
          style={{ left: b.left, top: b.top, animationDelay: b.delay, '--fw': b.color }}
        />
      ))}
      <style>{`
        .fw {
          position: absolute;
          width: 6px; height: 6px; border-radius: 9999px;
          background: var(--fw);
          box-shadow: 0 0 0 var(--fw);
          opacity: 0;
          animation: fw 4.5s ease-out infinite;
        }
        @keyframes fw {
          0% { transform: scale(0.2); opacity: 0; }
          8% { opacity: 1; }
          22% {
            opacity: 0;
            box-shadow:
              0 -40px 0 -2px var(--fw), 0 40px 0 -2px var(--fw),
              -40px 0 0 -2px var(--fw), 40px 0 0 -2px var(--fw),
              28px 28px 0 -2px var(--fw), -28px 28px 0 -2px var(--fw),
              28px -28px 0 -2px var(--fw), -28px -28px 0 -2px var(--fw);
          }
          23%, 100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .fw { animation: none; opacity: 0; } }
      `}</style>
    </div>
  )
}
