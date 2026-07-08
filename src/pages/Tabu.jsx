import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useWakeLock } from '../lib/wakeLock.js'
import { TABU_DECK } from '../data/tabuDeck.js'
import { subscribeSettings } from '../lib/settings.js'
import {
  endTabuRound,
  nextTabuTurn,
  pauseTabuRound,
  resetTabuGame,
  resumeTabuRound,
  startTabuRound,
  submitTabuAnswer,
  subscribeTabuGame,
  updateTabuSettings,
} from '../lib/tabu.js'

const DURATIONS = [60, 90, 120]
const LEVELS = [
  { id: 0, label: 'Hepsi' },
  { id: 1, label: 'Kolay' },
  { id: 2, label: 'Orta' },
  { id: 3, label: 'Zor' },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Tabu() {
  useWakeLock()
  const { user } = useAuth()
  const [game, setGame] = useState(null)
  const [settings, setSettings] = useState({ tabuAdminOnly: false })
  const [timeLeft, setTimeLeft] = useState(60)

  const queue = useRef([])
  const queueLevel = useRef(-1)

  useEffect(() => {
    const u1 = subscribeTabuGame((data) => {
      if (!data) {
        resetTabuGame() // Firebase boşsa başlat
      } else {
        setGame(data)
      }
    })
    const u2 = subscribeSettings(setSettings)
    return () => {
      u1()
      u2()
    }
  }, [])

  const isNarrator = game?.startedBy === user?.uid
  const canStart = !settings.tabuAdminOnly || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'

  // Sayaç Mantığı
  useEffect(() => {
    if (!game) return
    if (game.status === 'playing' && game.expiresAt) {
      const msLeft = game.expiresAt - Date.now()
      if (msLeft > 0) {
        setTimeLeft(Math.floor(msLeft / 1000))
        const t = setInterval(() => {
          const remaining = Math.floor((game.expiresAt - Date.now()) / 1000)
          if (remaining <= 0) {
            setTimeLeft(0)
            clearInterval(t)
            if (isNarrator) handleTimeUp()
          } else {
            setTimeLeft(remaining)
          }
        }, 1000)
        return () => clearInterval(t)
      } else {
        setTimeLeft(0)
        if (isNarrator) handleTimeUp()
      }
    } else {
      setTimeLeft(game.timeLeft)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, game?.expiresAt, game?.timeLeft, isNarrator])

  const getNextCard = () => {
    if (queue.current.length === 0 || queueLevel.current !== game.level) {
      const pool = game.level === 0 ? TABU_DECK : TABU_DECK.filter((c) => c.level === game.level)
      queue.current = shuffle(pool)
      queueLevel.current = game.level
    }
    return queue.current.pop()
  }

  const handleTimeUp = async () => {
    if (!game) return
    const passPenalty = Math.max(0, game.round.pass - 3)
    await endTabuRound(game.teams, game.turn, passPenalty, game.round.correct, game.round.tabu)
  }

  const startRound = async () => {
    if (!canStart) return
    await startTabuRound(user.uid, getNextCard(), game.duration)
  }

  const answer = async (type) => {
    if (!isNarrator || !game) return
    if (type === 'pass' && game.round.pass >= 3) type = 'tabu'
    await submitTabuAnswer(type, getNextCard(), game.round)
  }

  const togglePause = async () => {
    if (!isNarrator || !game) return
    if (game.status === 'playing') {
      await pauseTabuRound(timeLeft)
    } else if (game.status === 'paused') {
      await resumeTabuRound(timeLeft)
    }
  }

  if (!game) return <div className="p-4 text-slate-400">Yükleniyor...</div>

  // ---- EKRANLAR ----
  
  if (game.status === 'playing' || game.status === 'paused') {
    const isPaused = game.status === 'paused'
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">
            {game.teams[game.turn].name} anlatıyor
            {!isNarrator && <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">Denetçi Modu</span>}
          </span>
          <span
            className={`font-display text-2xl font-bold tabular-nums ${
              timeLeft <= 10 && !isPaused ? 'text-rose-400 animate-pulse' : 'gold-text'
            }`}
          >
            {timeLeft}
          </span>
        </div>

        <div className={`card overflow-hidden transition ${isPaused ? 'opacity-50 blur-sm' : ''}`}>
          <div className="bg-gradient-to-b from-gold-400 to-gold-600 text-night-950 text-center py-4">
            <div className="font-display text-3xl font-extrabold">{game.activeCard?.word}</div>
          </div>
          <ul className="p-4 space-y-1.5">
            {game.activeCard?.taboo.map((t) => (
              <li key={t} className="text-center text-rose-300 font-medium">
                {t}
              </li>
            ))}
          </ul>
        </div>

        {isNarrator ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => answer('tabu')} disabled={isPaused} className="btn bg-rose-500/90 text-white py-4 disabled:opacity-50">
                ⛔ Tabu
              </button>
              <button onClick={() => answer('pass')} disabled={isPaused} className="btn-ghost py-4 disabled:opacity-50">
                ⏭️ Pas
              </button>
              <button onClick={() => answer('correct')} disabled={isPaused} className="btn bg-emerald-500 text-night-950 py-4 disabled:opacity-50">
                ✅ Doğru
              </button>
            </div>
            
            <button onClick={togglePause} className="btn-ghost w-full py-3">
              {isPaused ? '▶️ Süreyi Devam Ettir' : '⏸️ Süreyi Durdur (Tartışma)'}
            </button>
          </>
        ) : (
          <div className="text-center p-4 bg-night-900/50 rounded-xl border border-white/10">
            <p className="text-slate-300 text-sm">Şu an ekranı anlatan kişi yönetiyor.</p>
            <p className="text-xs text-slate-500 mt-1">Siz sadece kelimeleri denetleyebilirsiniz.</p>
            {isPaused && <p className="text-rose-400 text-sm font-bold mt-2">Oyun Duraklatıldı!</p>}
          </div>
        )}

        <div className="flex justify-center gap-4 text-sm text-slate-400">
          <span className="text-emerald-400">Doğru {game.round.correct}</span>
          <span>Pas {game.round.pass}</span>
          <span className="text-rose-400">Tabu {game.round.tabu}</span>
        </div>
        <div className="text-center text-[11px] text-slate-500 mt-1">
          (En fazla 3 pas bedava, sonrası Tabu sayılır)
        </div>
      </div>
    )
  }

  if (game.status === 'roundEnd') {
    const passPenalty = Math.max(0, game.round.pass - 3)
    const net = game.round.correct - game.round.tabu - passPenalty
    return (
      <div className="space-y-4">
        <div className="card p-6 text-center">
          <div className="text-4xl mb-2">⏱️</div>
          <h2 className="font-display text-xl font-bold">Süre bitti!</h2>
          <p className="text-slate-300 mt-1">{game.teams[game.turn].name} bu turda</p>
          <div className="font-display text-3xl font-bold gold-text mt-2">
            {net > 0 ? '+' : ''}
            {net} puan
          </div>
          <div className="flex justify-center gap-4 text-sm text-slate-400 mt-2">
            <span className="text-emerald-400">Doğru {game.round.correct}</span>
            <span>Pas {game.round.pass}</span>
            <span className="text-rose-400">Tabu {game.round.tabu}</span>
          </div>
          {passPenalty > 0 && (
            <div className="text-center text-xs text-rose-400/80 mt-1.5">
              (3 pas hakkı aşıldı: {passPenalty} pastan dolayı ekstra -{passPenalty} puan)
            </div>
          )}
        </div>
        <Scoreboard teams={game.teams} turn={game.turn} />
        {isAdmin || canStart ? (
          <button onClick={() => nextTabuTurn(game.turn, game.teams.length, game.duration)} className="btn-gold w-full py-3.5">
            Sıradaki takım →
          </button>
        ) : (
          <p className="text-center text-sm text-slate-500">Yöneticinin sıradaki takıma geçmesi bekleniyor...</p>
        )}
      </div>
    )
  }

  // setup
  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-lg">🃏 Tabu</h1>
          {game.status !== 'setup' && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Devam eden oyun var</span>}
        </div>
        <div className="space-y-2">
          {game.teams.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-6">{i + 1}.</span>
              <input
                className="input py-2"
                value={t.name}
                readOnly={!isAdmin}
                onChange={(e) => {
                  const newTeams = [...game.teams]
                  newTeams[i].name = e.target.value
                  updateTabuSettings({ teams: newTeams })
                }}
              />
              <span className="text-sm text-slate-400 w-10 text-right tabular-nums">{t.score}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-12">Süre:</span>
          {DURATIONS.map((d) => (
            <button
              key={d}
              disabled={!isAdmin && !canStart}
              onClick={() => updateTabuSettings({ duration: d, timeLeft: d })}
              className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                game.duration === d
                  ? 'border-gold-400/50 bg-gold-500/15 text-gold-200'
                  : 'border-white/10 text-slate-300'
              } disabled:opacity-50`}
            >
              {d} sn
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-12">Zorluk:</span>
          {LEVELS.map((l) => (
            <button
              key={l.id}
              disabled={!isAdmin && !canStart}
              onClick={() => updateTabuSettings({ level: l.id })}
              className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                game.level === l.id
                  ? 'border-gold-400/50 bg-gold-500/15 text-gold-200'
                  : 'border-white/10 text-slate-300'
              } disabled:opacity-50`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">
          {TABU_DECK.length} kart havuzu var.
        </p>
      </div>

      <div className="card p-4 text-center">
        <p className="text-slate-300 text-sm mb-3">
          Sıra: <b>{game.teams[game.turn].name}</b> takımında.
        </p>
        
        {canStart ? (
          <button onClick={startRound} className="btn-gold w-full py-3.5">
            ▶️ Turu başlat ({game.duration} sn)
          </button>
        ) : (
          <div className="bg-night-900/50 border border-white/10 rounded-lg p-3">
            <p className="text-xs text-slate-400">Yönetici tarafından "Tabu başlatma" ayarı kilitli.</p>
            <p className="text-xs font-bold text-gold-300 mt-1">Sadece yönetici başlatabilir.</p>
          </div>
        )}
      </div>

      <Scoreboard teams={game.teams} turn={game.turn} />
      
      {(isAdmin || canStart) && (
        <button onClick={() => {
          if (confirm('Tüm skorlar silinecek ve yeni bir oyun başlayacak. Emin misiniz?')) {
            resetTabuGame()
          }
        }} className="w-full text-center text-xs text-rose-400/80 hover:text-rose-400 transition">
          ⚠️ Oyunu Tamamen Sıfırla
        </button>
      )}
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
