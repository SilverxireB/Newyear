import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { subscribeUsers } from '../lib/users.js'
import { AWARD_CATEGORIES, castVote, clearVote, subscribeAwards, tallyCategory } from '../lib/awards.js'

const niceName = (s = '') =>
  s
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1).toLocaleLowerCase('tr'))
    .join(' ')

export default function Awards() {
  const { user } = useAuth()
  const uid = user?.uid
  const [data, setData] = useState({})
  const [users, setUsers] = useState([])

  useEffect(() => {
    const a = subscribeAwards(setData)
    const b = subscribeUsers(setUsers)
    return () => {
      a()
      b()
    }
  }, [])

  const nameByUid = useMemo(() => {
    const m = {}
    for (const u of users) m[u.id] = u.name || 'biri'
    return m
  }, [users])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">🏆 Gecenin Ödülleri</h1>
        <p className="text-slate-400 text-sm">Herkes birbirini oylar; en çok oyu alan kazanır 😄</p>
      </div>

      {AWARD_CATEGORIES.map((cat) => {
        const tally = tallyCategory(data, cat.id)
        const leader = tally[0]
        const myVote = data?.[cat.id]?.[uid]
        return (
          <section key={cat.id} className="card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{cat.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold">{cat.title}</div>
                {leader ? (
                  <div className="text-xs text-gold-300">
                    👑 {niceName(nameByUid[leader.uid])} · {leader.count} oy
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Henüz oy yok</div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => {
                const votes = tally.find((t) => t.uid === u.id)?.count || 0
                const mine = myVote === u.id
                return (
                  <button
                    key={u.id}
                    onClick={() => (mine ? clearVote(cat.id, uid) : castVote(cat.id, uid, u.id))}
                    className={`px-2.5 py-1.5 rounded-full text-xs border transition ${
                      mine
                        ? 'bg-gold-500/20 border-gold-400/50 text-gold-200'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    {niceName(u.name)}
                    {votes > 0 && <span className="text-slate-400"> · {votes}</span>}
                  </button>
                )
              })}
              {users.length === 0 && <span className="text-slate-500 text-sm">Kişi yok.</span>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
