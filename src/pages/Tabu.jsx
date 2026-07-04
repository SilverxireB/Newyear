import { useEffect, useRef, useState } from 'react'
import { TABU_DECK } from '../data/tabuDeck.js'

const DURATIONS = [60, 90, 120]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Tabu() {
  const [teams, setTeams] = useState([
    { name: 'Takım 1', score: 0 },
    { name: 'Takım 2', score: 0 },
  ])
  const [duration, setDuration] = useState(60)
  const [phase, setPhase] = useState('setup') // setup | playing | roundEnd
  const [turn, setTurn] = useState(0)
  const [timeLeft, setTimeLeft] = useState(duration)
  const [card, setCard] = useState(null)
  const [round, setRound] = useState({ correct: 0, pass: 0, tabu: 0 })

  const queue = useRef([])

  const drawCard = () => {
    if (queue.current.length === 0) queue.current = shuffle(TABU_DECK)
    setCard(queue.current.pop())
  }

  // Sayaç
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) {
      endRound()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  const startRound = () => {
    setRound({ correct: 0, pass: 0, tabu: 0 })
    setTimeLeft(duration)
    drawCard()
    setPhase('playing')
  }

  const endRound = () => {
    setTeams((ts) =>
      ts.map((t, i) => (i === turn ? { ...t, score: t.score + round.correct - round.tabu } : t)),
    )
    setPhase('roundEnd')
  }

  const answer = (type) => {
    setRound((r) => ({ ...r, [type]: r[type] + 1 }))
    drawCard()
  }

  const nextTurn = () => {
    setTurn((t) => (t + 1) % teams.length)
    setPhase('setup')
  }

  const resetAll = () => {
    setTeams((ts) => ts.map((t) => ({ ...t, score: 0 })))
    setTurn(0)
    setPhase('setup')
  }

  // ---- Ekranlar ----
  if (phase === 'playing') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">{teams[turn].name} anlatıyor</span>
          <span
            className={`font-display text-2xl font-bold tabular-nums ${
              timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'gold-text'
            }`}
          >
            {timeLeft}
          </span>
        </div>

        <div className="card overflow-hidden">
          <div className="bg-gradient-to-b from-gold-400 to-gold-600 text-night-950 text-center py-4">
            <div className="font-display text-3xl font-extrabold">{card?.word}</div>
          </div>
          <ul className="p-4 space-y-1.5">
            {card?.taboo.map((t) => (
              <li key={t} className="text-center text-rose-300 font-medium">
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => answer('tabu')} className="btn bg-rose-500/90 text-white py-4">
            ⛔ Tabu
          </button>
          <button onClick={() => answer('pass')} className="btn-ghost py-4">
            ⏭️ Pas
          </button>
          <button onClick={() => answer('correct')} className="btn bg-emerald-500 text-night-950 py-4">
            ✅ Doğru
          </button>
        </div>

        <div className="flex justify-center gap-4 text-sm text-slate-400">
          <span className="text-emerald-400">Doğru {round.correct}</span>
          <span>Pas {round.pass}</span>
          <span className="text-rose-400">Tabu {round.tabu}</span>
        </div>
      </div>
    )
  }

  if (phase === 'roundEnd') {
    const net = round.correct - round.tabu
    return (
      <div className="space-y-4">
        <div className="card p-6 text-center">
          <div className="text-4xl mb-2">⏱️</div>
          <h2 className="font-display text-xl font-bold">Süre bitti!</h2>
          <p className="text-slate-300 mt-1">{teams[turn].name} bu turda</p>
          <div className="font-display text-3xl font-bold gold-text mt-2">
            {net > 0 ? '+' : ''}
            {net} puan
          </div>
          <div className="flex justify-center gap-4 text-sm text-slate-400 mt-2">
            <span className="text-emerald-400">Doğru {round.correct}</span>
            <span>Pas {round.pass}</span>
            <span className="text-rose-400">Tabu {round.tabu}</span>
          </div>
        </div>
        <Scoreboard teams={teams} turn={turn} />
        <button onClick={nextTurn} className="btn-gold w-full py-3.5">
          Sıradaki takım →
        </button>
      </div>
    )
  }

  // setup
  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <h1 className="font-display font-bold text-lg">🃏 Tabu</h1>
        <div className="space-y-2">
          {teams.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-6">{i + 1}.</span>
              <input
                className="input py-2"
                value={t.name}
                onChange={(e) =>
                  setTeams((ts) => ts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
              <span className="text-sm text-slate-400 w-10 text-right tabular-nums">{t.score}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Süre:</span>
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                duration === d
                  ? 'border-gold-400/50 bg-gold-500/15 text-gold-200'
                  : 'border-white/10 text-slate-300'
              }`}
            >
              {d} sn
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4 text-center">
        <p className="text-slate-300 text-sm mb-3">
          Sıra: <b>{teams[turn].name}</b> anlatacak. Telefonu anlatan tutar, karşı takım "tabu"
          kelimeleri denetler.
        </p>
        <button onClick={startRound} className="btn-gold w-full py-3.5">
          ▶️ Turu başlat ({duration} sn)
        </button>
      </div>

      <Scoreboard teams={teams} turn={turn} />
      <button onClick={resetAll} className="w-full text-center text-sm text-slate-500">
        Skorları sıfırla
      </button>
    </div>
  )
}

function Scoreboard({ teams, turn }) {
  return (
    <div className="card p-4">
      <h3 className="font-display font-bold mb-2">Skor</h3>
      <ul className="space-y-1.5">
        {teams.map((t, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className={`flex-1 ${i === turn ? 'text-gold-300 font-semibold' : ''}`}>
              {t.name}
            </span>
            <span className="font-display font-bold tabular-nums">{t.score}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
