// Ekranın en üstüne asılı, yanıp sönen peri ışığı dizisi. Tamamen dekoratif,
// tıklamaları engellemez (pointer-events yok). Hareket azaltma tercihine saygılı.
export default function FairyLights() {
  const colors = ['#ff5a5f', '#39b35a', '#f7d066', '#fff1c9', '#5ab0ff']
  const count = 22
  const bulbs = Array.from({ length: count }, (_, i) => ({
    color: colors[i % colors.length],
    delay: `${(i % 6) * 0.22}s`,
  }))

  return (
    <div className="fairy pointer-events-none fixed top-0 inset-x-0 z-30" aria-hidden="true">
      <div className="fairy-wire" />
      <div className="fairy-row">
        {bulbs.map((b, i) => (
          <span key={i} className="bulb" style={{ '--c': b.color, animationDelay: b.delay }} />
        ))}
      </div>
      <style>{`
        .fairy { height: 20px; }
        .fairy-wire {
          position: absolute; top: 2px; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
        }
        .fairy-row {
          position: relative; display: flex; justify-content: space-around; padding: 0 4px;
        }
        .bulb {
          width: 7px; height: 10px; border-radius: 50% 50% 45% 45%;
          background: var(--c);
          box-shadow: 0 0 6px 1px var(--c);
          transform: translateY(3px);
          animation: bulbTwinkle 2.4s ease-in-out infinite;
        }
        @keyframes bulbTwinkle {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 4px 0 var(--c); }
          50% { opacity: 1; box-shadow: 0 0 10px 2px var(--c); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bulb { animation: none; opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
