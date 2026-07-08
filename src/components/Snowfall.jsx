import { useEffect, useRef } from 'react'

// Hafif, canvas tabanlı kar yağışı. Ekran boyutuna göre tane sayısı ayarlanır,
// sekme arka plandayken rAF kendiliğinden yavaşlar. Hareket azaltma tercihine saygılı.
export default function Snowfall() {
  const ref = useRef(null)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    let raf
    let w = 0
    let h = 0
    let flakes = []

    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -8,
      r: 1 + Math.random() * 2.6,
      sp: 0.4 + Math.random() * 1.1,
      dr: -0.5 + Math.random(),
      o: 0.35 + Math.random() * 0.5,
      ph: Math.random() * Math.PI * 2,
    })

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * DPR
      canvas.height = h * DPR
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      const count = Math.round(Math.min(90, (w * h) / 16000))
      flakes = Array.from({ length: count }, () => spawn(true))
    }

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#ffffff'
      for (const f of flakes) {
        f.y += f.sp
        f.ph += 0.01
        f.x += f.dr + Math.sin(f.ph) * 0.4
        if (f.y > h + 8) Object.assign(f, spawn(false))
        if (f.x < -8) f.x = w + 8
        else if (f.x > w + 8) f.x = -8
        ctx.globalAlpha = f.o
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }

    resize()
    tick()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10" />
}
