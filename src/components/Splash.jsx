// Sinematik açılış: çizilen altın halka → logo doğuşu → kıvılcım patlaması → başlık.
// Saf CSS, tek dosya; prefers-reduced-motion'a saygılı.
export default function Splash() {
  const sparks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 360
    return { a, d: i % 2 === 0 ? 92 : 64, delay: 0.95 + (i % 3) * 0.05 }
  })

  return (
    <div className="splash-root">
      {/* nefes alan arka plan ışıması */}
      <div className="splash-glow" aria-hidden="true" />

      <div className="splash-stage">
        {/* kendini çizen altın halka */}
        <svg className="splash-ring" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffe9a8" />
              <stop offset="55%" stopColor="#f7d066" />
              <stop offset="100%" stopColor="#c9990f" />
            </linearGradient>
          </defs>
          <circle className="ring-track" cx="60" cy="60" r="54" />
          <circle className="ring-draw" cx="60" cy="60" r="54" stroke="url(#sg)" />
        </svg>

        {/* kıvılcımlar (halka tamamlanınca patlar) */}
        {sparks.map((s, i) => (
          <span
            key={i}
            className="spark"
            style={{
              '--a': `${s.a}deg`,
              '--d': `${s.d}px`,
              animationDelay: `${s.delay}s`,
            }}
            aria-hidden="true"
          />
        ))}

        {/* logo doğuşu */}
        <img src="/icon-192.png" alt="" className="splash-logo" />
      </div>

      {/* başlık: harf harf yükselir, üstünden ışık süpürmesi geçer */}
      <h1 className="splash-title" aria-label="Newyear Traitors">
        {'Newyear Traitors'.split('').map((ch, i) => (
          <span key={i} style={{ animationDelay: `${1.15 + i * 0.035}s` }}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </h1>

      <div className="splash-sub">
        <span className="dot" />
        <span className="dot" style={{ animationDelay: '.15s' }} />
        <span className="dot" style={{ animationDelay: '.3s' }} />
      </div>

      <style>{`
        .splash-root {
          min-height: 100dvh;
          display: grid;
          place-content: center;
          justify-items: center;
          gap: 22px;
          overflow: hidden;
          position: relative;
        }
        .splash-glow {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(420px 300px at 50% 42%, rgba(232,185,35,.14), transparent 70%),
            radial-gradient(700px 500px at 50% 120%, rgba(99,102,241,.10), transparent 60%);
          animation: glowPulse 3.2s ease-in-out infinite alternate;
        }
        @keyframes glowPulse { from { opacity:.55 } to { opacity:1 } }

        .splash-stage { position: relative; width: 148px; height: 148px; display: grid; place-items: center; }

        .splash-ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
        .ring-track { fill: none; stroke: rgba(255,255,255,.07); stroke-width: 2.5; }
        .ring-draw {
          fill: none; stroke-width: 2.5; stroke-linecap: round;
          stroke-dasharray: 339.3; stroke-dashoffset: 339.3;
          filter: drop-shadow(0 0 6px rgba(247,208,102,.55));
          animation: ringDraw 1s cubic-bezier(.65,0,.35,1) .15s forwards,
                     ringFade 1.2s ease 1.6s forwards;
        }
        @keyframes ringDraw { to { stroke-dashoffset: 0; } }
        @keyframes ringFade { to { opacity: .35; } }

        .splash-logo {
          width: 96px; height: 96px; border-radius: 24px;
          box-shadow: 0 18px 50px -12px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.08);
          opacity: 0; transform: scale(.4) rotate(-8deg);
          animation: logoIn .8s cubic-bezier(.2,1.4,.35,1) .55s forwards;
        }
        @keyframes logoIn {
          60% { opacity: 1; transform: scale(1.06) rotate(1.5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }

        .spark {
          position: absolute; left: 50%; top: 50%;
          width: 5px; height: 5px; border-radius: 999px;
          background: linear-gradient(180deg, #ffe9a8, #f7d066);
          opacity: 0;
          transform: rotate(var(--a)) translateY(0) scale(.4);
          animation: sparkFly .9s cubic-bezier(.15,.8,.3,1) forwards;
        }
        @keyframes sparkFly {
          8% { opacity: 1; }
          100% { opacity: 0; transform: rotate(var(--a)) translateY(calc(var(--d) * -1)) scale(1); }
        }

        .splash-title {
          margin: 0; display: flex;
          font-family: Poppins, ui-sans-serif, sans-serif;
          font-weight: 800; font-size: clamp(1.35rem, 6vw, 1.9rem);
          letter-spacing: .01em; line-height: 1;
          background: linear-gradient(100deg, #ffe9a8 20%, #f7d066 45%, #fff6d8 50%, #f7d066 55%, #ffe9a8 80%);
          background-size: 250% auto;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: sheen 2.6s linear 2.1s infinite;
        }
        .splash-title span {
          display: inline-block; opacity: 0;
          transform: translateY(14px) rotate(4deg);
          animation: letterIn .5s cubic-bezier(.2,1.2,.35,1) forwards;
        }
        @keyframes letterIn { to { opacity: 1; transform: translateY(0) rotate(0); } }
        @keyframes sheen { to { background-position: -250% center; } }

        .splash-sub { display: flex; gap: 7px; opacity: 0; animation: fadeIn .6s ease 1.9s forwards; }
        .dot {
          width: 6px; height: 6px; border-radius: 999px;
          background: rgba(247,208,102,.8);
          animation: dotBounce 1s ease-in-out infinite;
        }
        @keyframes dotBounce { 0%,100% { transform: translateY(0); opacity:.5 } 50% { transform: translateY(-5px); opacity:1 } }
        @keyframes fadeIn { to { opacity: 1 } }

        @media (prefers-reduced-motion: reduce) {
          .splash-ring, .spark, .splash-glow { display: none; }
          .splash-logo, .splash-title span, .splash-sub { animation: none; opacity: 1; transform: none; }
          .splash-title { animation: none; }
          .dot { animation: none; }
        }
      `}</style>
    </div>
  )
}
