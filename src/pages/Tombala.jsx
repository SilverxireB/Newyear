import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { subscribeFamilies } from '../lib/families.js'
import { formatTL } from '../lib/expenses.js'
import {
  analyzeCard,
  CARD_COLORS,
  claimWin,
  drawNext,
  finalizeGame,
  makeCard,
  resetGame,
  setMyCard,
  startGame,
  subscribeCards,
  subscribeGame,
} from '../lib/tombala.js'

export default function Tombala() {
  const { user, profile, admin } = useAuth()
  const [game, setGame] = useState(undefined)
  const [cards, setCards] = useState([])
  const [families, setFamilies] = useState([])

  useEffect(() => {
    const u1 = subscribeGame(setGame)
    const u2 = subscribeCards(setCards)
    const u3 = subscribeFamilies(setFamilies)
    return () => {
      u1()
      u2()
      u3()
    }
  }, [])

  if (game === undefined) {
    return <div className="text-center text-slate-400 py-10">Tombala yükleniyor…</div>
  }

  const playing = game?.status === 'playing'
  const mode = game?.mode
  const drawn = game?.drawn || []
  const drawnSet = new Set(drawn)

  return (
    <div className="space-y-5">
      <Winners game={game} />

      {admin && (
        <HostPanel game={game} user={user} profile={profile} cards={cards} families={families} />
      )}

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
            <MyCardArea cards={cards} user={user} profile={profile} drawnSet={drawnSet} game={game} />
          )}
          <DrawnStrip drawn={drawn} />
        </>
      )}

      {game?.status === 'finished' && <ResultView game={game} families={families} />}
    </div>
  )
}

function ResultView({ game, families }) {
  const result = game?.result
  const famById = Object.fromEntries(families.map((f) => [f.id, f]))
  return (
    <div className="card p-5">
      <div className="text-center mb-4">
        <div className="text-5xl mb-2">🏆</div>
        <h2 className="font-display text-xl font-bold gold-text">Oyun bitti!</h2>
        {result?.pot ? (
          <p className="text-slate-300 text-sm mt-1">Havuz: {formatTL(result.pot)}</p>
        ) : null}
      </div>

      {result?.awarded?.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Kazananlar</h3>
          <ul className="space-y-1.5">
            {result.awarded.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-gold-400">🏅</span>
                <span className="flex-1">
                  <b>{a.name}</b> · {a.type}
                </span>
                <span className="tabular-nums text-emerald-400">{formatTL(a.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.perFamily && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Aile başı kâr / zarar</h3>
          <ul className="space-y-1.5">
            {Object.entries(result.perFamily).map(([id, net]) => {
              const fam = famById[id]
              return (
                <li key={id} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full" style={{ background: fam?.color }} />
                  <span className="flex-1">{fam?.name}</span>
                  <span
                    className={`tabular-nums font-medium ${
                      net > 0.01 ? 'text-emerald-400' : net < -0.01 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {Math.abs(net) < 0.01 ? '—' : `${net > 0 ? '+' : ''}${formatTL(net)}`}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Bu sonuç masraf tablosuna eklendi — "Kim Kime Borçlu" hesabına dahil. 🎱
          </p>
        </div>
      )}
    </div>
  )
}

function HostPanel({ game, user, profile, cards, families }) {
  const playing = game?.status === 'playing'
  const [busy, setBusy] = useState(false)
  const [auto, setAuto] = useState(false)
  const [sec, setSec] = useState(5)
  const [bet, setBet] = useState(200)

  const drawnCount = game?.drawn?.length || 0
  const gameRef = useRef(game)
  gameRef.current = game

  // Otomatik çekme: her çekişten sonra 'sec' saniye bekleyip yenisini çeker.
  useEffect(() => {
    if (!auto || !playing || drawnCount >= 90) return
    const t = setTimeout(() => {
      drawNext(gameRef.current)
    }, sec * 1000)
    return () => clearTimeout(t)
  }, [auto, playing, drawnCount, sec])

  const begin = async (m) => {
    setBusy(true)
    setAuto(false)
    try {
      await startGame({
        mode: m,
        hostUid: user.uid,
        hostName: profile.name,
        bet: m === 'cards' ? bet : 0,
      })
    } finally {
      setBusy(false)
    }
  }

  const endAndSettle = async () => {
    setBusy(true)
    setAuto(false)
    try {
      await finalizeGame({ game: gameRef.current, cards, families })
    } finally {
      setBusy(false)
    }
  }

  if (!playing) {
    return (
      <div className="card p-4 space-y-3">
        <h2 className="font-display font-bold">🎛️ Oyunu başlat (yönetici)</h2>

        <div>
          <label className="label">Giriş bahsi (kart başı ₺)</label>
          <input
            className="input"
            inputMode="numeric"
            value={bet}
            onChange={(e) => setBet(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="200"
          />
          <p className="mt-1 text-xs text-slate-500">
            Havuz = seçilen kart sayısı × bahis. Ödül: 1. çinko %20, 2. çinko %20, tombala %60.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button onClick={() => begin('cards')} disabled={busy} className="btn-gold py-3">
            🎴 Kartlı Tombala — herkes kendi kartını seçer
          </button>
          <button onClick={() => begin('numbers')} disabled={busy} className="btn-ghost py-3">
            🔢 Sadece Numara Çek — kart yok, bahissiz
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Kartlı modda herkese 6 kart gösterilir, beğendiğini seçer. Numara modunda elindeki fiziki
          kartla oynarsınız, site sadece numara çeker.
        </p>
      </div>
    )
  }

  const cardsMode = game.mode === 'cards'
  const pot = cardsMode ? (cards.length * (game.bet || 0)) : 0

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold">
          🎛️ Yönetici · {cardsMode ? 'Kartlı' : 'Numara'}
        </h2>
        <span className="text-xs text-slate-400">{drawnCount}/90</span>
      </div>

      {cardsMode && (
        <div className="flex items-center justify-between rounded-xl bg-night-900/60 border border-white/10 p-3 text-sm">
          <span className="text-slate-300">
            🎟️ {cards.length} kart · bahis {formatTL(game.bet || 0)}
          </span>
          <span className="font-semibold gold-text">Havuz {formatTL(pot)}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => drawNext(gameRef.current)}
          disabled={busy || drawnCount >= 90 || auto}
          className="btn-gold flex-1 py-3"
        >
          🎲 Numara Çek
        </button>
        {cardsMode ? (
          <button onClick={endAndSettle} disabled={busy} className="btn-ghost px-4">
            Bitir & hesapla
          </button>
        ) : (
          <button onClick={() => resetGame()} className="btn-ghost px-4">
            Bitir
          </button>
        )}
      </div>

      {/* Otomatik çekme */}
      <div className="rounded-xl bg-night-900/60 border border-white/10 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">🔁 Otomatik çek</span>
          <button
            onClick={() => setAuto((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition ${auto ? 'bg-gold-500' : 'bg-white/15'}`}
            aria-label="otomatik çek"
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                auto ? 'left-6' : 'left-0.5'
              }`}
            />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-slate-400">Aralık:</span>
          {[3, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => setSec(s)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                sec === s
                  ? 'border-gold-400/50 bg-gold-500/15 text-gold-200'
                  : 'border-white/10 text-slate-300'
              }`}
            >
              {s} sn
            </button>
          ))}
          {auto && <span className="text-xs text-gold-300 ml-auto animate-pulse">çekiliyor…</span>}
        </div>
      </div>
    </div>
  )
}

/* ---------- Kart alanı: seçim ya da kartın ---------- */

function MyCardArea({ cards, user, profile, drawnSet, game }) {
  const mine = cards.find((c) => c.id === user.uid)
  if (!mine) return <CardPicker user={user} profile={profile} />
  return <MyCard card={mine} drawnSet={drawnSet} game={game} profile={profile} uid={user.uid} />
}

function makeCandidates() {
  const shuffled = [...CARD_COLORS].sort(() => Math.random() - 0.5)
  return Array.from({ length: 6 }, (_, i) => ({
    cells: makeCard(),
    color: shuffled[i % shuffled.length],
    cardNo: Math.floor(1 + Math.random() * 999),
  }))
}

function CardPicker({ user, profile }) {
  const [candidates, setCandidates] = useState(makeCandidates)
  const [busy, setBusy] = useState(false)

  const pick = async (cand) => {
    setBusy(true)
    try {
      await setMyCard({
        uid: user.uid,
        name: profile.name,
        familyId: profile.familyId,
        cells: cand.cells,
        color: cand.color,
        cardNo: cand.cardNo,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-bold">🎴 Kartını seç</h3>
        <button
          onClick={() => setCandidates(makeCandidates())}
          className="text-xs text-slate-400 hover:text-slate-100"
        >
          🔄 Yeni kartlar
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Beğendiğin kartı seç, oyun onunla oynanır. Beğenmezsen "Yeni kartlar".
      </p>
      <div className="space-y-4">
        {candidates.map((cand, i) => (
          <div key={i}>
            <TombalaCard cells={cand.cells} color={cand.color} cardNo={cand.cardNo} />
            <button onClick={() => pick(cand)} disabled={busy} className="btn-gold w-full mt-2 py-2.5">
              Bu kartı seç
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function MyCard({ card, drawnSet, game, profile, uid }) {
  const analysis = useMemo(() => analyzeCard(card.cells, drawnSet), [card.cells, drawnSet])
  const alreadyCinko = (game.winners?.cinko || []).some((w) => w.uid === uid)
  const alreadyTombala = (game.winners?.tombala || []).some((w) => w.uid === uid)

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

      <TombalaCard cells={card.cells} color={card.color} cardNo={card.cardNo} drawnSet={drawnSet} />

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
            analysis.tombala && !alreadyTombala ? 'btn-gold' : 'bg-white/5 text-slate-500'
          }`}
        >
          {alreadyTombala ? '✓ Tombala' : '🏆 Tombala!'}
        </button>
      </div>
    </div>
  )
}

/* ---------- Klasik renkli tombala kartı ---------- */

function TombalaCard({ cells, color, cardNo, drawnSet }) {
  return (
    <div
      className="rounded-xl overflow-hidden shadow-lg"
      style={{ border: `5px solid ${color}`, background: '#f7efdb' }}
    >
      <div
        className="flex items-center justify-between px-2 py-1 text-[11px] font-bold tracking-widest text-white"
        style={{ background: color }}
      >
        <span>TOMBALA</span>
        {cardNo != null && <span className="opacity-90">No {cardNo}</span>}
      </div>
      <div className="grid grid-rows-3 gap-px bg-black/15 p-px">
        {[0, 1, 2].map((r) => (
          <div key={r} className="grid grid-cols-9 gap-px">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => {
              const v = cells[r * 9 + c]
              if (v == null) {
                return (
                  <span
                    key={c}
                    className="aspect-square"
                    style={{ background: hexA(color, 0.14) }}
                  />
                )
              }
              const on = drawnSet?.has(v)
              return (
                <span
                  key={c}
                  className="relative aspect-square grid place-items-center bg-[#fdf8ec]"
                >
                  <span
                    className={`font-display font-bold tabular-nums text-[3.4vw] sm:text-base ${
                      on ? 'text-[#7a2a1a]' : 'text-[#2b2115]'
                    }`}
                  >
                    {v}
                  </span>
                  {on && (
                    <span
                      className="absolute inset-[12%] rounded-full animate-pop"
                      style={{ background: hexA('#d8332a', 0.42), border: '2px solid #d8332a' }}
                    />
                  )}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// hex + alpha -> rgba string
function hexA(hex, a) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

/* ---------- Ortak parçalar ---------- */

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
