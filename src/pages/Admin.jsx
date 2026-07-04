import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { ensureFamiliesSeeded, renameFamily, subscribeFamilies } from '../lib/families.js'
import { setUserFamily, setUserRole, subscribeUsers } from '../lib/users.js'

export default function Admin() {
  const { user } = useAuth()
  const [families, setFamilies] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    ensureFamiliesSeeded().catch(() => {})
    const u1 = subscribeFamilies(setFamilies)
    const u2 = subscribeUsers(setUsers)
    return () => {
      u1()
      u2()
    }
  }, [])

  const adminCount = users.filter((u) => u.role === 'admin').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Yönetim</h1>
        <p className="text-slate-400 text-sm">
          Aile adlarını, kişilerin ailesini ve rolleri düzenle.
        </p>
      </div>

      <section className="card p-4">
        <h2 className="font-display font-bold mb-3">Aileler</h2>
        <div className="space-y-2.5">
          {families.map((f) => (
            <FamilyRow key={f.id} family={f} />
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-display font-bold mb-3">Kişiler ({users.length})</h2>
        <div className="space-y-3">
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              families={families}
              currentUid={user.uid}
              adminCount={adminCount}
            />
          ))}
          {users.length === 0 && (
            <p className="text-slate-500 text-sm">Henüz giriş yapan yok.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function FamilyRow({ family }) {
  const [name, setName] = useState(family.name)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    if (name.trim() && name !== family.name) {
      await renameFamily(family.id, name.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-4 h-4 rounded-full shrink-0" style={{ background: family.color }} />
      <input
        className="input py-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
      />
      {saved && <span className="text-xs text-emerald-400">✓</span>}
    </div>
  )
}

function UserRow({ user, families, currentUid, adminCount }) {
  const isSelf = user.id === currentUid
  const isAdmin = user.role === 'admin'
  // Son yöneticiyi (ya da kendini tek yöneticiysen) düşürmeyi engelle.
  const lockDemote = isAdmin && (isSelf || adminCount <= 1)

  const toggleRole = () => {
    if (isAdmin && lockDemote) return
    setUserRole(user.id, isAdmin ? 'member' : 'admin')
  }

  return (
    <div className="rounded-xl bg-night-900/50 border border-white/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium flex items-center gap-1.5">
            <span className="truncate">{user.name}</span>
            {isAdmin && (
              <span className="shrink-0 text-[10px] bg-gold-500/20 text-gold-300 px-1.5 py-0.5 rounded-full">
                yönetici
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 truncate">{user.email}</div>
        </div>
        <button
          onClick={toggleRole}
          disabled={lockDemote}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
            isAdmin
              ? 'border-white/10 text-slate-300 disabled:opacity-40'
              : 'border-gold-400/40 text-gold-200 bg-gold-500/10'
          }`}
        >
          {isAdmin ? 'Yönetici kaldır' : 'Yönetici yap'}
        </button>
      </div>
      <select
        className="input py-2"
        value={user.familyId || ''}
        onChange={(e) => setUserFamily(user.id, e.target.value || null)}
      >
        <option value="">— aile seç —</option>
        {families.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  )
}
