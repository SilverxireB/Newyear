import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { subscribeUsers } from '../lib/users.js'
import {
  addHouse,
  clearVote,
  deleteHouse,
  setChosen,
  setVote,
  sortHouses,
  subscribeHouses,
  tally,
} from '../lib/houses.js'
import { compressImage, isCloudinaryConfigured, uploadToCloudinary } from '../cloudinary.js'

const REACTIONS = [
  { key: 'love', emoji: '😍', label: 'Bayıldım' },
  { key: 'ok', emoji: '👍', label: 'Olur' },
  { key: 'meh', emoji: '😐', label: 'Farketmez' },
  { key: 'veto', emoji: '❌', label: 'Asla' },
]

// Linkin sitesine göre buton yazısı.
function linkLabel(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    if (host.includes('airbnb')) return "Airbnb'de Aç"
    if (host.includes('booking')) return "Booking'de Aç"
    return `${host} · Aç`
  } catch {
    return 'Linki Aç'
  }
}

export default function Houses() {
  const { profile, user, admin } = useAuth()
  const uid = user?.uid
  const [houses, setHouses] = useState([])
  const [users, setUsers] = useState([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const u1 = subscribeHouses(setHouses)
    const u2 = subscribeUsers(setUsers)
    return () => {
      u1()
      u2()
    }
  }, [])

  const nameByUid = useMemo(() => {
    const m = {}
    for (const u of users) m[u.id] = u.name || 'Biri'
    return m
  }, [users])

  const sorted = useMemo(() => sortHouses(houses), [houses])
  const totalVoters = users.length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">🏠 Ev Seçimi</h1>
          <p className="text-slate-400 text-sm">Aday evleri ekle, herkes oylasın.</p>
        </div>
        <button onClick={() => setAdding((v) => !v)} className="btn-gold px-3 py-2 text-sm">
          {adding ? 'Kapat' : '+ Ev Ekle'}
        </button>
      </div>

      {adding && (
        <AddHouseForm
          uid={uid}
          name={profile?.name}
          onDone={() => setAdding(false)}
        />
      )}

      {sorted.length === 0 && !adding && (
        <div className="card p-6 text-center text-slate-400 text-sm">
          Henüz aday ev yok. <br /> Sağ üstten “+ Ev Ekle” ile ilk evi ekle.
        </div>
      )}

      <div className="space-y-4">
        {sorted.map((h) => (
          <HouseCard
            key={h.id}
            house={h}
            uid={uid}
            admin={admin}
            nameByUid={nameByUid}
            totalVoters={totalVoters}
          />
        ))}
      </div>
    </div>
  )
}

function AddHouseForm({ uid, name, onDone }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const blob = (await compressImage(file, 1400, 0.82)) || file
      const res = await uploadToCloudinary(blob)
      setPhotoUrl(res.secure_url)
    } catch {
      alert('Fotoğraf yüklenemedi, tekrar dene.')
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    if (!url.trim() && !title.trim()) {
      alert('En azından bir link ya da isim yaz.')
      return
    }
    setSaving(true)
    try {
      await addHouse({ title, url, price, location, note, photoUrl, uid, name })
      onDone()
    } catch {
      alert('Kaydedilemedi, tekrar dene.')
      setSaving(false)
    }
  }

  return (
    <div className="card p-4 space-y-3 animate-fade-up">
      <input className="input py-2.5" placeholder="Ev adı (örn. Uludağ Dağ Evi)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className="input py-2.5" placeholder="Link (Airbnb / Booking …)" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
      <div className="grid grid-cols-2 gap-3">
        <input className="input py-2.5" placeholder="Fiyat/gece" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input className="input py-2.5" placeholder="Konum" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <input className="input py-2.5" placeholder="Not (örn. 5 oda, jakuzili)" value={note} onChange={(e) => setNote(e.target.value)} />

      {isCloudinaryConfigured && (
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-night-900/70 border border-white/10 grid place-items-center text-2xl">🏠</div>
          )}
          <label className="btn-ghost px-3 py-2 text-sm cursor-pointer">
            {uploading ? 'Yükleniyor…' : photoUrl ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
            <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} disabled={uploading} />
          </label>
          {photoUrl && !uploading && (
            <button onClick={() => setPhotoUrl('')} className="text-slate-500 text-sm">Kaldır</button>
          )}
        </div>
      )}

      <button onClick={submit} disabled={saving || uploading} className="btn-gold w-full">
        {saving ? 'Ekleniyor…' : 'Evi Ekle'}
      </button>
    </div>
  )
}

function HouseCard({ house, uid, admin, nameByUid, totalVoters }) {
  const t = tally(house)
  const myVote = house.votes?.[uid]
  const canDelete = admin || house.addedByUid === uid
  const notVotedCount = Math.max(0, totalVoters - t.total)

  const react = (key) => {
    if (myVote === key) clearVote(house.id, uid)
    else setVote(house.id, uid, key)
  }

  const remove = () => {
    if (confirm(`"${house.title}" evini silmek istiyor musun?`)) deleteHouse(house.id)
  }

  return (
    <div className={`card overflow-hidden ${house.chosen ? 'ring-2 ring-gold-400/70' : ''}`}>
      {/* Fotoğraf / kapak */}
      <div className="relative">
        {house.photoUrl ? (
          <img src={house.photoUrl} alt="" className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-28 bg-gradient-to-br from-night-700 to-night-900 grid place-items-center text-4xl">🏠</div>
        )}
        {house.chosen && (
          <span className="absolute top-2 left-2 bg-gold-500 text-night-950 text-xs font-bold px-2 py-1 rounded-lg shadow">
            🏆 SEÇİLDİ
          </span>
        )}
        {t.vetoes.length > 0 && (
          <span className="absolute top-2 right-2 bg-rose-600/90 text-white text-xs font-bold px-2 py-1 rounded-lg shadow">
            🚫 {t.vetoes.length} asla
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-lg truncate">{house.title}</h3>
            <div className="text-xs text-slate-400 flex flex-wrap gap-x-2">
              {house.price && <span>💰 {house.price}</span>}
              {house.location && <span>📍 {house.location}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`font-display font-bold text-lg ${t.score > 0 ? 'text-emerald-400' : t.score < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {t.score > 0 ? `+${t.score}` : t.score}
            </div>
            <div className="text-[10px] text-slate-500">puan</div>
          </div>
        </div>

        {house.note && <p className="text-sm text-slate-300">{house.note}</p>}

        {/* Veto uyarısı: kim asla dedi */}
        {t.vetoes.length > 0 && (
          <div className="text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg px-3 py-2">
            🚫 Asla diyen: {t.vetoes.map((v) => nameByUid[v] || 'Biri').join(', ')}
          </div>
        )}

        {house.url && (
          <a
            href={house.url}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost w-full py-2.5 text-sm"
          >
            🔗 {linkLabel(house.url)}
          </a>
        )}

        {/* Tepki butonları */}
        <div className="grid grid-cols-4 gap-2">
          {REACTIONS.map((r) => {
            const active = myVote === r.key
            const count = t.counts[r.key]
            return (
              <button
                key={r.key}
                onClick={() => react(r.key)}
                className={`flex flex-col items-center py-2 rounded-xl border text-xs transition active:scale-95 ${
                  active
                    ? r.key === 'veto'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                      : 'bg-gold-500/20 border-gold-400/50 text-gold-200'
                    : 'bg-night-900/50 border-white/10 text-slate-300'
                }`}
              >
                <span className="text-xl leading-none">{r.emoji}</span>
                <span className="mt-1">{r.label}</span>
                {count > 0 && <span className="text-[10px] text-slate-400">{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Alt bilgi: oy durumu + yönetim */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500">
            {t.total}/{totalVoters} oy{notVotedCount > 0 ? ` · ${notVotedCount} kişi bekliyor` : ' · herkes oyladı ✅'}
          </span>
          <div className="flex items-center gap-3">
            {admin && (
              <button
                onClick={() => setChosen(house.id, !house.chosen)}
                className={`text-xs font-semibold ${house.chosen ? 'text-slate-400' : 'text-gold-300'}`}
              >
                {house.chosen ? 'Seçimi kaldır' : '🏆 Bunu seç'}
              </button>
            )}
            {canDelete && (
              <button onClick={remove} className="text-xs text-rose-400/80">Sil</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
