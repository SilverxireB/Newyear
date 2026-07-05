import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { subscribeFamilies } from '../lib/families.js'
import { setUserFamily } from '../lib/users.js'
import { computeSettlement, formatTL, subscribeExpenses } from '../lib/expenses.js'
import { subscribeLedger, sumLedger } from '../lib/tombala.js'

export default function Home() {
  const { user, profile } = useAuth()
  const [families, setFamilies] = useState([])
  const [expenses, setExpenses] = useState([])
  const [ledger, setLedger] = useState([])
  const [pickFamily, setPickFamily] = useState(false)
  const countdown = useCountdown()

  useEffect(() => {
    const u1 = subscribeFamilies(setFamilies)
    const u2 = subscribeExpenses(setExpenses)
    const u3 = subscribeLedger(setLedger)
    return () => {
      u1()
      u2()
      u3()
    }
  }, [])

  const settlement = useMemo(
    () => computeSettlement(families, expenses, sumLedger(ledger)),
    [families, expenses, ledger],
  )
  const myFamily = families.find((f) => f.id === profile?.familyId)
  const myBalance = settlement.perFamily[profile?.familyId]?.balance ?? 0

  return (
    <div className="space-y-5">
      {/* Hero + geri sayım */}
      <section className="card p-5 text-center animate-fade-up overflow-hidden relative">
        <div className="text-4xl">🥂</div>
        <h1 className="mt-2 font-display text-2xl font-bold">
          Mutlu Yıllar, <span className="gold-text">{profile?.name?.split(' ')[0]}</span>!
        </h1>
        <p className="mt-1 text-slate-300 text-sm">Yeni yıla kalan süre</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          <TimeBox value={countdown.days} label="Gün" />
          <TimeBox value={countdown.hours} label="Saat" />
          <TimeBox value={countdown.minutes} label="Dk" />
          <TimeBox value={countdown.seconds} label="Sn" />
        </div>
      </section>

      {/* Aile durumu */}
      <section className="grid grid-cols-2 gap-3">
        <button onClick={() => setPickFamily(true)} className="card p-4 text-left active:scale-[0.99] transition">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Ailen</span>
            <span className="text-gold-400">değiştir</span>
          </div>
          <div className="mt-1 flex items-center gap-2 font-semibold">
            {myFamily && (
              <span
                className="w-3.5 h-3.5 rounded-full"
                style={{ background: myFamily.color }}
              />
            )}
            <span className="truncate">{myFamily?.name || '— seç —'}</span>
          </div>
        </button>
        <div className="card p-4">
          <div className="text-xs text-slate-400">Aile durumun</div>
          <div
            className={`mt-1 font-semibold ${
              myBalance > 0 ? 'text-emerald-400' : myBalance < 0 ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {myBalance > 0
              ? `+${formatTL(myBalance)} alacak`
              : myBalance < 0
                ? `${formatTL(myBalance)} borç`
                : 'Denk 👌'}
          </div>
        </div>
      </section>

      {/* Kısayollar */}
      <section className="grid grid-cols-2 gap-3">
        <ShortcutCard to="/masraf" icon="💸" title="Masraflar" sub={formatTL(settlement.total)} />
        <ShortcutCard to="/oyunlar" icon="🎮" title="Oyunlar" sub="Tombala · Tabu · Vampir" />
      </section>

      {/* Aileler özeti */}
      {families.length > 0 && (
        <section className="card p-4 animate-fade-up">
          <h2 className="font-display font-bold text-slate-100 mb-3">Aileler</h2>
          <ul className="space-y-2.5">
            {families.map((f) => {
              const bal = settlement.perFamily[f.id]?.balance ?? 0
              return (
                <li key={f.id} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: f.color }} />
                  <span className="flex-1 text-sm">{f.name}</span>
                  <span
                    className={`text-sm font-medium ${
                      bal > 0 ? 'text-emerald-400' : bal < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {bal === 0 ? 'denk' : formatTL(bal)}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {pickFamily && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
          onClick={() => setPickFamily(false)}
        >
          <div className="card w-full max-w-sm p-4 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold mb-1">Aileni seç</h3>
            <p className="text-xs text-slate-400 mb-3">Yanlış seçtiysen buradan değiştirebilirsin.</p>
            <div className="space-y-2">
              {families.map((f) => {
                const mine = f.id === profile?.familyId
                return (
                  <button
                    key={f.id}
                    onClick={async () => {
                      await setUserFamily(user.uid, f.id)
                      setPickFamily(false)
                    }}
                    className={`w-full p-3 rounded-xl border flex items-center gap-3 text-left transition ${
                      mine ? 'border-gold-400/50 bg-gold-500/10' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <span className="w-8 h-8 rounded-full shrink-0" style={{ background: f.color }} />
                    <span className="flex-1 font-semibold">{f.name}</span>
                    {mine && <span className="text-gold-400 text-sm">✓</span>}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setPickFamily(false)} className="mt-3 w-full text-center text-sm text-slate-400">
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TimeBox({ value, label }) {
  return (
    <div className="rounded-xl bg-night-900/70 border border-white/10 py-2.5">
      <div className="font-display text-2xl font-bold gold-text tabular-nums">
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}

function ShortcutCard({ to, icon, title, sub }) {
  return (
    <Link to={to} className="card p-4 flex items-center gap-3 active:scale-[0.99] transition">
      <span className="text-2xl">{icon}</span>
      <span>
        <span className="block font-semibold text-slate-100">{title}</span>
        <span className="block text-xs text-slate-400">{sub}</span>
      </span>
    </Link>
  )
}

function nextNewYear() {
  const now = new Date()
  // Bir sonraki 1 Ocak 00:00
  return new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0)
}

function useCountdown() {
  const [target] = useState(nextNewYear)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const diff = Math.max(0, target.getTime() - now)
  const s = Math.floor(diff / 1000)
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  }
}
