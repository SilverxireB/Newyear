import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { compressImage, isCloudinaryConfigured, uploadToCloudinary } from '../cloudinary.js'
import {
  addMission,
  addSub,
  likeCount,
  removeMission,
  removeSub,
  subscribeMissions,
  subscribeSubs,
  toggleLike,
} from '../lib/missions.js'

const niceName = (s = '') =>
  s
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1).toLocaleLowerCase('tr'))
    .join(' ')

export default function PhotoMissions() {
  const { profile, user, admin } = useAuth()
  const uid = user?.uid
  const [missions, setMissions] = useState([])
  const [subs, setSubs] = useState([])
  const [title, setTitle] = useState('')

  useEffect(() => {
    const a = subscribeMissions(setMissions)
    const b = subscribeSubs(setSubs)
    return () => {
      a()
      b()
    }
  }, [])

  const ordered = useMemo(() => [...missions].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)), [missions])
  const subsByMission = useMemo(() => {
    const m = {}
    for (const s of subs) (m[s.missionId] ||= []).push(s)
    for (const k of Object.keys(m)) m[k].sort((a, b) => likeCount(b) - likeCount(a) || (a.addedAt || 0) - (b.addedAt || 0))
    return m
  }, [subs])

  const create = async () => {
    if (!title.trim()) return
    try {
      await addMission({ title, uid, name: profile?.name })
      setTitle('')
    } catch (e) {
      alert(e?.code === 'permission-denied' ? 'İzin hatası: kuralları yayınla (missions).' : 'Eklenemedi.')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">📸 Foto Görevleri</h1>
        <p className="text-slate-400 text-sm">Görevi tamamla, fotoğrafını yükle; en çok beğenilen kazanır.</p>
      </div>

      {/* Görev ekle */}
      <div className="card p-3 flex gap-2">
        <input
          className="input py-2.5 flex-1"
          placeholder="Görev yaz (örn. 4 aile birlikte kare)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <button onClick={create} className="btn-gold px-4 text-sm shrink-0">
          Görev Ekle
        </button>
      </div>

      {ordered.length === 0 && (
        <div className="card p-6 text-center text-slate-400 text-sm">
          Henüz görev yok. Yukarıdan ilk görevi ekle 📷
        </div>
      )}

      {ordered.map((m) => (
        <MissionCard
          key={m.id}
          mission={m}
          subs={subsByMission[m.id] || []}
          uid={uid}
          admin={admin}
          name={profile?.name}
        />
      ))}
    </div>
  )
}

function MissionCard({ mission, subs, uid, admin, name }) {
  const [uploading, setUploading] = useState(false)
  const canDelMission = admin || mission.byUid === uid
  const best = subs[0] && likeCount(subs[0]) > 0 ? subs[0].id : null

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const blob = (await compressImage(file, 1600, 0.82)) || file
      const res = await uploadToCloudinary(blob)
      await addSub({ missionId: mission.id, photoUrl: res.secure_url, publicId: res.public_id, uid, name })
    } catch (err) {
      if (err?.code === 'permission-denied') {
        alert('İzin hatası: Firestore kurallarını yayınla (missionSubs). Console → Rules → Publish.')
      } else {
        alert(`Yüklenemedi: ${err?.code || err?.message || 'bilinmeyen hata'}`)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none">🎯</span>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold leading-tight">{mission.title}</div>
          <div className="text-[11px] text-slate-500">
            {niceName(mission.byName)} · {subs.length} katılım
          </div>
        </div>
        {isCloudinaryConfigured && (
          <label className="btn-gold px-3 py-1.5 text-xs cursor-pointer shrink-0">
            {uploading ? '…' : '📷 Ekle'}
            <input type="file" accept="image/*" className="hidden" onChange={pick} disabled={uploading} />
          </label>
        )}
        {canDelMission && (
          <button
            onClick={() => confirm('Görevi sil?') && removeMission(mission.id)}
            className="text-slate-500 hover:text-rose-400 text-sm px-1 shrink-0"
            aria-label="Görevi sil"
          >
            ✕
          </button>
        )}
      </div>

      {subs.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {subs.map((s) => {
            const liked = !!(s.likes && uid in s.likes)
            const n = likeCount(s)
            const isBest = s.id === best
            return (
              <div key={s.id} className={`relative rounded-xl overflow-hidden ${isBest ? 'ring-2 ring-gold-400' : ''}`}>
                <img src={s.photoUrl} alt="" className="w-full h-32 object-cover" />
                {isBest && (
                  <span className="absolute top-1 left-1 bg-gold-500 text-night-950 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    🏆 Önde
                  </span>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-white/90 truncate">{niceName(s.byName)}</span>
                  <button
                    onClick={() => toggleLike(s.id, uid, liked)}
                    className={`text-xs px-1.5 rounded ${liked ? 'text-rose-400' : 'text-white/80'}`}
                  >
                    {liked ? '❤️' : '🤍'} {n > 0 ? n : ''}
                  </button>
                </div>
                {(admin || s.byUid === uid) && (
                  <button
                    onClick={() => confirm('Fotoğrafı sil?') && removeSub(s.id)}
                    className="absolute top-1 right-1 bg-black/50 text-white/90 text-[10px] w-5 h-5 rounded-full"
                    aria-label="Sil"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
