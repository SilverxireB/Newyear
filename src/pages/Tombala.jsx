import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  analyzeCard,
  claimWin,
  drawNext,
  ensureCard,
  resetGame,
  startGame,
  subscribeCards,
  subscribeGame,
} from '../lib/tombala.js'

export default function Tombala() {
  const { user, profile, admin } = useAuth()
  const [game, setGame] = useState(undefined) // undefined=yükleniyor, null=hiç oyun yok
  const [cards, setCards] = useState([])

  useEffect(() => {
    const u1 = subscribeGame(setGame)
    const u2 = subscribeCards(setCards)
    return () => {
      u1()
      u2()
    }
  }, [])

  const playing = game?.status === 'playing'
  const mode = game?.mode

  // Kartlı modda oyuncu için kart oluştur.
  useEffect(() => {
    if (playing && mode === 'cards' && profile?.familyId) {
      ensureCard({ uid: user.uid, name: profile.name, familyId: profile.familyId }).catch(() => {})
    }
  }, [playing, mode, user?.uid, profile?.familyId, profile?.name])

  if (game === undefined) {
    return <div className="text-center text-slate-400 py-10">Tombala yükleniyor…</div>
  }

  const drawn = game?.drawn || []
  const drawnSet = new Set(drawn)

  return (
    <div className="space-y-5">
      <Winners game={game} />

      {admin && <HostPanel game={game} user={user} profile={profile} />}

      {!playing && !admin && (
        <div className="card p-8 text-center">
          <div className="text-6xl mb-3">🎱</div>
          <h1 className="font-display text-xl font-bold gold-text">Tombala henüz başlamadı</h1>
          <p className="mt-2 text-slate-300 text-sm">
            Yönetici oyunu başlatınca burada canlı olarak göreceksin.
          </p>
        </div>
      )}

      {playing && (
        <>
          <LastNumber game={game} />
          {mode === 'numbers' ? (
            <NumberBoard drawnSet={drawnSet} />
          ) : (
            <MyCard
              cards={cards}
              uid={user.uid}
              drawnSet={drawnSet}
              game={game}
              profile={profile}
            />
          )}
          <DrawnStrip drawn={drawn} />
        </>
      )}

      {game?.status === 'finished' && (
        <div className="card p-6 text-center">
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="font-display text-xl font-bold gold-text">Oyun bitti!</h2>
          <p className="text-slate-300 text-sm mt-1">Yeni oyun için yönetici başlatabilir.</p>
        </div>
      )}
    </div>
  )
}

function HostPanel({ game, user, profile }) {
  const playing = game?.status === 'playing'
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('cards')

  const begin = async (m) => {
    setBusy(true)
    try {
      await startGame({ mode: m, hostUid: user.uid, hostName: profile.name })
    } finally {
      setBusy(false)
    }
  }
  const draw = async () => {
    setBusy(true)
    try {
      await drawNext(game)
    } finally {
      setBusy(false)
    }
  }

  if (!playing) {
    return (
      <div className="card p-4 space-y-3">
        <h2 className="font-display font-bold">🎛️ Oyunu başlat (yönetici)</h2>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => begin('cards')}
            disabled={busy}
            className="btn-gold py-3"
          >
            🎴 Kartlı Tombala — herkese kart dağıt
          </button>
          <button
            onClick={() => begin('numbers')}
            disabled={busy}
            className="btn-ghost py-3"
          >
            🔢 Sadece Numara Çek — kart yok, canlı çekiliş
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Kartlı modda herkese otomatik tombala kartı gelir. Numara modunda elindeki fiziki kartla
          oynarsınız, site sadece numara çeker.
        </p>
      </div>
    )
  }

  const drawnCount = game.drawn?.length || 0
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold">
          🎛️ Yönetici · {game.mode === 'cards' ? 'Kartlı' : 'Numara'}
        </h2>
        <span className="text-xs text-slate-400">{drawnCount}/90 çekildi</span>
      </div>
      <div className="flex gap-2">
        <button onClick={draw} disabled={busy || drawnCount >= 90} className="btn-gold flex-1 py-3">
          🎲 Numara Çek
        </button>
        <button
          onClick={() => resetGame()}
          className="btn-ghost px-4"
        >
          Bitir / Sıfırla
        </button>
      </div>
    </div>
  )
}

function Winners({ game }) {
  const cinko = game?.winners?.cinko || []
  const tombala = game?.winners?.tombala || []
  if (cinko.length === 0 && tombala.length === 0) return null
  return (
    <div className="space-y-2">
      {tombala.map((w, i) => (
        <Banner key={`t${i}`} tone="tombala">
          🏆 <b>{w.name}</b> TOMBALA yaptı!
        </Banner>
      ))}
      {cinko.map((w, i) => (
        <Banner key={`c${i}`} tone="cinko">
          🎉 <b>{w.name}</b> çinko yaptı!
        </Banner>
      ))}
    </div>
  )
}

function Banner({ tone, children }) {
  const cls =
    tone === 'tombala'
      ? 'from-gold-400/30 to-gold-600/20 border-gold-400/50 text-gold-100'
      : 'from-emerald-400/20 to-emerald-600/10 border-emerald-400/40 text-emerald-100'
  return (
    <div className={`rounded-xl border bg-gradient-to-r p-3 text-sm text-center animate-pop ${cls}`}>
      {children}
    </div>
  )
}

function LastNumber({ game }) {
  const n = game?.lastNumber
  return (
    <div className="card p-6 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-400">Son çekilen</div>
      {n ? (
        <div
          key={n}
          className="mx-auto mt-2 w-24 h-24 rounded-full grid place-items-center bg-gradient-to-b from-gold-400 to-gold-600 text-night-950 font-display text-5xl font-extrabold animate-pop shadow-lg shadow-gold-600/40"
        >
          {n}
        </div>
      ) : (
        <div className="mt-3 text-slate-400">Henüz numara çekilmedi</div>
      )}
    </div>
  )
}

function DrawnStrip({ drawn }) {
  if (!drawn.length) return null
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-400 mb-2">Çekilenler ({drawn.length})</div>
      <div className="flex flex-wrap gap-1.5">
        {drawn.map((n) => (
          <span
            key={n}
            className="w-7 h-7 rounded-md bg-white/10 text-slate-200 text-xs grid place-items-center tabular-nums"
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}

function NumberBoard({ drawnSet }) {
  const nums = Array.from({ length: 90 }, (_, i) => i + 1)
  return (
    <div className="card p-3">
      <div className="grid grid-cols-9 sm:grid-cols-10 gap-1.5">
        {nums.map((n) => {
          const on = drawnSet.has(n)
          return (
            <span
              key={n}
              className={`aspect-square rounded-md grid place-items-center text-xs sm:text-sm tabular-nums transition ${
                on
                  ? 'bg-gradient-to-b from-gold-400 to-gold-600 text-night-950 font-bold animate-pop'
                  : 'bg-white/5 text-slate-500'
              }`}
            >
              {n}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function MyCard({ cards, uid, drawnSet, game, profile }) {
  const mine = cards.find((c) => c.id === uid)
  const analysis = useMemo(
    () => (mine ? analyzeCard(mine.cells, drawnSet) : null),
    [mine, drawnSet],
  )

  const alreadyCinko = (game.winners?.cinko || []).some((w) => w.uid === uid)
  const alreadyTombala = (game.winners?.tombala || []).some((w) => w.uid === uid)

  if (!mine) {
    return (
      <div className="card p-6 text-center text-slate-400">
        <div className="text-3xl mb-2">🎴</div>
        Kartın hazırlanıyor…
      </div>
    )
  }

  const claim = (type) =>
    claimWin(type, { uid, name: profile.name, familyId: profile.familyId }).catch(() => {})

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold">🎴 Kartın</h3>
        <span className="text-xs text-slate-400">
          {analysis.marked}/{analysis.total} işaretli
        </span>
      </div>

      <div className="grid grid-rows-3 gap-1.5">
        {[0, 1, 2].map((r) => (
          <div key={r} className="grid grid-cols-9 gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => {
              const v = mine.cells[r * 9 + c]
              if (v == null)
                return <span key={c} className="aspect-square rounded-md bg-white/5" />
              const on = drawnSet.has(v)
              return (
                <span
                  key={c}
                  className={`aspect-square rounded-md grid place-items-center text-xs sm:text-base font-semibold tabular-nums transition ${
                    on
                      ? 'bg-gradient-to-b from-gold-400 to-gold-600 text-night-950 animate-pop'
                      : 'bg-night-900/80 text-slate-200 border border-white/10'
                  }`}
                >
                  {v}
                </span>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => claim('cinko')}
          disabled={!analysis.cinko || alreadyCinko}
          className={`flex-1 py-2.5 rounded-xl font-semibold transition ${
            analysis.cinko && !alreadyCinko
              ? 'bg-emerald-500 text-night-950 animate-pop'
              : 'bg-white/5 text-slate-500'
          }`}
        >
          {alreadyCinko ? '✓ Çinko' : '🎉 Çinko!'}
        </button>
        <button
          onClick={() => claim('tombala')}
          disabled={!analysis.tombala || alreadyTombala}
          className={`flex-1 py-2.5 rounded-xl font-semibold transition ${
            analysis.tombala && !alreadyTombala
              ? 'btn-gold'
              : 'bg-white/5 text-slate-500'
          }`}
        >
          {alreadyTombala ? '✓ Tombala' : '🏆 Tombala!'}
        </button>
      </div>
    </div>
  )
}
