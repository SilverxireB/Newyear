import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { subscribeUsers } from '../lib/users.js'
import { dealRoles, resetGame, subscribeGame, subscribeMyRole } from '../lib/vampir.js'

export default function Vampir() {
  const { user, admin } = useAuth()
  const [game, setGame] = useState(undefined)
  const [myRole, setMyRole] = useState(null)

  useEffect(() => {
    const u1 = subscribeGame(setGame)
    const u2 = subscribeMyRole(user.uid, setMyRole)
    return () => {
      u1()
      u2()
    }
  }, [user.uid])

  if (game === undefined) {
    return <div className="text-center text-slate-400 py-10">Yükleniyor…</div>
  }

  const dealt = game?.status === 'dealt'
  const amPlaying = dealt && game.players?.some((p) => p.uid === user.uid)

  return (
    <div className="space-y-5">
      <div className="card p-4 text-center">
        <div className="text-4xl mb-1">🧛</div>
        <h1 className="font-display font-bold text-lg">Vampir Köylü</h1>
        <p className="text-xs text-slate-400">
          Roller gizli dağıtılır — herkes sadece kendi rolünü görür.
        </p>
      </div>

      {admin && <HostPanel game={game} user={user} />}

      {dealt && (
        <>
          {amPlaying ? (
            <RoleReveal role={myRole} />
          ) : (
            <div className="card p-6 text-center text-slate-400">
              Bu turda oynamıyorsun (yönetici seni seçmemiş). İzleyebilirsin. 🍿
            </div>
          )}
          <PlayersList game={game} />
        </>
      )}

      {!dealt && !admin && (
        <div className="card p-6 text-center text-slate-400">
          Yönetici rolleri dağıtınca rolün burada görünecek.
        </div>
      )}
    </div>
  )
}

function RoleReveal({ role }) {
  const [show, setShow] = useState(false)
  const isVamp = role?.role === 'vampir'

  const hold = {
    onPointerDown: () => setShow(true),
    onPointerUp: () => setShow(false),
    onPointerLeave: () => setShow(false),
    onPointerCancel: () => setShow(false),
    onContextMenu: (e) => e.preventDefault(),
  }

  return (
    <div className="card p-5 text-center">
      <h3 className="font-display font-bold mb-3">🎭 Rolün</h3>
      {!show ? (
        <button
          {...hold}
          className="btn-gold w-full py-6 text-base select-none touch-none"
        >
          👁️ Görmek için BASILI TUT
        </button>
      ) : (
        <div
          {...hold}
          className={`select-none touch-none rounded-2xl py-8 px-4 animate-pop ${
            isVamp
              ? 'bg-gradient-to-b from-rose-600 to-rose-800 text-white'
              : 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-night-950'
          }`}
        >
          <div className="text-6xl mb-2">{isVamp ? '🧛' : '🧑‍🌾'}</div>
          <div className="font-display text-3xl font-extrabold">
            {isVamp ? 'VAMPİRSİN' : 'KÖYLÜSÜN'}
          </div>
          {isVamp && role?.mates?.length > 0 && (
            <div className="mt-3 text-sm">
              Diğer vampir{role.mates.length > 1 ? 'ler' : ''}:{' '}
              <b>{role.mates.join(', ')}</b>
            </div>
          )}
          {isVamp && (!role?.mates || role.mates.length === 0) && (
            <div className="mt-3 text-sm opacity-90">Tek vampir sensin 😈</div>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Parmağını çekince gizlenir. Kimse görmesin, ellerinle kapat. 🤫
      </p>
    </div>
  )
}

function PlayersList({ game }) {
  return (
    <div className="card p-4">
      <h3 className="font-display font-bold mb-2">
        Oyuncular ({game.players?.length || 0}) · {game.vampCount} vampir
      </h3>
      <div className="flex flex-wrap gap-2">
        {game.players?.map((p) => (
          <span
            key={p.uid}
            className="text-sm bg-white/5 border border-white/10 rounded-lg px-2.5 py-1"
          >
            {p.name}
          </span>
        ))}
      </div>
    </div>
  )
}

function HostPanel({ game, user }) {
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null) // Set of uids
  const [vampCount, setVampCount] = useState(2)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => subscribeUsers(setUsers), [])

  // Varsayılan: herkes seçili
  const playersFromUsers = useMemo(() => users.map((u) => ({ uid: u.id, name: u.name })), [users])
  const sel = selected ?? new Set(playersFromUsers.map((p) => p.uid))

  const toggle = (uid) => {
    const next = new Set(sel)
    next.has(uid) ? next.delete(uid) : next.add(uid)
    setSelected(next)
  }

  const players = playersFromUsers.filter((p) => sel.has(p.uid))
  const maxVamp = Math.max(1, players.length - 1)
  const vc = Math.min(vampCount, maxVamp)

  const deal = async () => {
    if (players.length < 1) return
    setBusy(true)
    setError('')
    try {
      await dealRoles({ players, vampCount: vc, hostUid: user.uid, hostName: user.displayName })
    } catch (e) {
      setError(e?.message || 'Dağıtılamadı, tekrar dene.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <h2 className="font-display font-bold">🎛️ Rol dağıt (yönetici)</h2>

      <div>
        <div className="text-sm text-slate-300 mb-2">Kimler oynuyor?</div>
        <div className="flex flex-wrap gap-2">
          {playersFromUsers.map((p) => {
            const on = sel.has(p.uid)
            return (
              <button
                key={p.uid}
                onClick={() => toggle(p.uid)}
                className={`text-sm rounded-lg px-2.5 py-1.5 border transition ${
                  on
                    ? 'border-gold-400/50 bg-gold-500/15 text-gold-200'
                    : 'border-white/10 text-slate-400'
                }`}
              >
                {on ? '✓ ' : ''}
                {p.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-300">Vampir sayısı:</span>
        <button
          onClick={() => setVampCount((v) => Math.max(1, v - 1))}
          className="w-8 h-8 rounded-lg bg-white/10 text-lg"
        >
          −
        </button>
        <span className="font-display font-bold text-lg w-6 text-center">{vc}</span>
        <button
          onClick={() => setVampCount((v) => Math.min(maxVamp, v + 1))}
          className="w-8 h-8 rounded-lg bg-white/10 text-lg"
        >
          +
        </button>
        <span className="text-xs text-slate-500 ml-auto">{players.length} oyuncu</span>
      </div>

      <div className="flex gap-2">
        <button onClick={deal} disabled={busy || players.length < 1} className="btn-gold flex-1 py-3">
          🎲 {game?.status === 'dealt' ? 'Yeniden dağıt' : 'Rolleri dağıt'}
        </button>
        {game?.status === 'dealt' && (
          <button onClick={() => resetGame()} className="btn-ghost px-4">
            Bitir
          </button>
        )}
      </div>
      {playersFromUsers.length < 3 && (
        <p className="text-xs text-slate-500">
          Şu an {playersFromUsers.length} kişi giriş yapmış. Gerçek oyun için 4+ kişi iyi olur ama
          tek başına da test edebilirsin.
        </p>
      )}
      {error && <p className="text-xs text-rose-400">Hata: {error}</p>}
    </div>
  )
}
