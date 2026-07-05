import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { ensureFamiliesSeeded, subscribeFamilies } from '../lib/families.js'
import { setUserFamily } from '../lib/users.js'
import Fireworks from '../components/Fireworks.jsx'

export default function SelectFamily() {
  const { user, profile, admin, signOut } = useAuth()
  const [families, setFamilies] = useState([])
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // Yönetici ilk kez girdiyse 4 varsayılan aileyi oluştur.
    if (admin) ensureFamiliesSeeded().catch(() => {})
    return subscribeFamilies(setFamilies)
  }, [admin])

  const choose = async (familyId) => {
    setSaving(familyId)
    setError('')
    try {
      await setUserFamily(user.uid, familyId)
    } catch {
      setError('Kaydedilemedi, tekrar dene.')
      setSaving(null)
    }
  }

  return (
    <div className="min-h-[100dvh] px-4 py-10">
      <Fireworks />
      <div className="mx-auto max-w-md animate-fade-up">
        <div className="text-center">
          <div className="text-5xl mb-3">👋</div>
          <h1 className="font-display text-2xl font-bold text-slate-100">
            Merhaba {profile?.name?.split(' ')[0]}!
          </h1>
          <p className="mt-2 text-slate-300">Hangi ailedensin? (sonra değiştirilebilir)</p>
        </div>

        <div className="mt-6 space-y-3">
          {families.length === 0 && (
            <p className="text-center text-slate-500 text-sm">Aileler yükleniyor…</p>
          )}
          {families.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => choose(f.id)}
              disabled={saving === f.id}
              className="card w-full p-4 flex items-center gap-3 text-left active:scale-[0.99] transition disabled:opacity-60"
            >
              <span
                className="w-10 h-10 rounded-full shrink-0"
                style={{ background: f.color }}
              />
              <span className="flex-1 font-semibold text-slate-100">{f.name}</span>
              {saving === f.id ? (
                <span className="text-sm text-slate-400">…</span>
              ) : (
                <span className="text-slate-500">›</span>
              )}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-center text-sm text-rose-400">{error}</p>}

        <button onClick={signOut} className="mt-8 w-full text-center text-sm text-slate-500">
          Farklı hesapla gir
        </button>
      </div>
    </div>
  )
}
