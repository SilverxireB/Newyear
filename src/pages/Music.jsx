import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  addToQueue,
  fetchYouTubeMeta,
  loadYouTubeApi,
  parseYouTube,
  removeFromQueue,
  setPlaying,
  subscribeMusicState,
  subscribeQueue,
} from '../lib/music.js'

export default function Music() {
  const { profile, user, admin } = useAuth()
  const uid = user?.uid
  const [queue, setQueue] = useState([])
  const [state, setState] = useState({ isPlaying: true })
  const [isPlayer, setIsPlayer] = useState(false)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [qError, setQError] = useState('')

  useEffect(() => {
    const u1 = subscribeQueue(setQueue, (e) => setQError(e?.code || e?.message || 'okuma hatası'))
    const u2 = subscribeMusicState(setState)
    return () => {
      u1()
      u2()
    }
  }, [])

  const now = queue[0] || null
  const upNext = queue.slice(1)
  const isPlaying = state.isPlaying !== false

  const add = async () => {
    const videoId = parseYouTube(input)
    if (!videoId) {
      alert('Geçerli bir YouTube linki yapıştır (youtube.com veya youtu.be).')
      return
    }
    setAdding(true)
    try {
      const meta = await fetchYouTubeMeta(videoId)
      await addToQueue({ videoId, ...meta, uid, name: profile?.name })
      setInput('')
    } catch (err) {
      if (err?.code === 'permission-denied') {
        alert('İzin hatası: Firestore kuralları henüz yayınlanmamış. Firebase Console → Rules → yapıştır → Publish yap.')
      } else {
        alert(`Eklenemedi: ${err?.code || err?.message || 'bilinmeyen hata'}`)
      }
    } finally {
      setAdding(false)
    }
  }

  const skip = () => {
    if (now) removeFromQueue(now.id)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">🎵 Müzik Kuyruğu</h1>
        <p className="text-slate-400 text-sm">Herkes şarkı ekler, sırayla çalar.</p>
      </div>

      {qError && (
        <div className="card p-3 text-xs text-rose-300 bg-rose-500/10 border-rose-500/30">
          Kuyruk okunamadı: {qError}. Firestore kurallarında “queue” için okuma izni olduğundan emin ol.
        </div>
      )}

      {/* Şarkı ekleme */}
      <div className="card p-3 flex gap-2">
        <input
          className="input py-2.5 flex-1"
          placeholder="YouTube linki yapıştır…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          inputMode="url"
        />
        <button onClick={add} disabled={adding} className="btn-gold px-4 text-sm shrink-0">
          {adding ? '…' : 'Ekle'}
        </button>
      </div>

      {/* Şimdi çalıyor */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold">Şimdi çalıyor</h2>
          <button
            onClick={() => setIsPlayer((v) => !v)}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition ${
              isPlayer
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/5 text-slate-300 border-white/10'
            }`}
          >
            {isPlayer ? '📻 Bu cihaz çalıyor' : '📻 Bu cihazda çal'}
          </button>
        </div>

        {!now && (
          <div className="text-slate-400 text-sm py-6 text-center">
            Kuyruk boş. Yukarıdan bir şarkı ekle 🎧
          </div>
        )}

        {now && isPlayer && (
          <PlayerEngine now={now} isPlaying={isPlaying} onEnded={() => removeFromQueue(now.id)} />
        )}

        {now && !isPlayer && (
          <div className="flex items-center gap-3">
            {now.thumbnail && (
              <img src={now.thumbnail} alt="" className="w-24 h-16 rounded-lg object-cover" />
            )}
            <div className="min-w-0">
              <div className="font-medium text-sm line-clamp-2">{now.title}</div>
              <div className="text-xs text-slate-500">{now.author}</div>
            </div>
          </div>
        )}

        {now && (
          <>
            <div className="flex items-center gap-2">
              <button onClick={() => setPlaying(!isPlaying)} className="btn-ghost flex-1 py-2.5 text-sm">
                {isPlaying ? '⏸ Duraklat' : '▶️ Devam'}
              </button>
              <button onClick={skip} className="btn-ghost flex-1 py-2.5 text-sm">
                ⏭ Atla
              </button>
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Ekleyen: {now.addedByName || 'biri'}
            </p>
          </>
        )}

        {!isPlayer && now && (
          <p className="text-[11px] text-amber-300/80 text-center">
            Ses çıkması için hoparlöre bağlı cihazda “Bu cihazda çal” aç.
          </p>
        )}
      </section>

      {/* Sırada */}
      <section className="space-y-2">
        <h2 className="font-display font-bold text-sm text-slate-300 px-1">
          Sırada ({upNext.length})
        </h2>
        {upNext.length === 0 && (
          <p className="text-slate-500 text-sm px-1">Sırada başka şarkı yok.</p>
        )}
        {upNext.map((item, i) => {
          const canRemove = admin || item.addedByUid === uid
          return (
            <div key={item.id} className="card p-2.5 flex items-center gap-3">
              <span className="text-slate-500 text-sm w-5 text-center shrink-0">{i + 1}</span>
              {item.thumbnail && (
                <img src={item.thumbnail} alt="" className="w-16 h-10 rounded object-cover shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{item.title}</div>
                <div className="text-[11px] text-slate-500 truncate">{item.addedByName}</div>
              </div>
              {canRemove && (
                <button
                  onClick={() => removeFromQueue(item.id)}
                  className="text-slate-500 hover:text-rose-400 text-sm px-1 shrink-0"
                  aria-label="Kaldır"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

// YouTube çalar motoru — sadece "çalar cihaz"da render edilir.
function PlayerEngine({ now, isPlaying, onEnded }) {
  const hostRef = useRef(null)
  const playerRef = useRef(null)
  const currentIdRef = useRef(null)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  // Oynatıcıyı bir kez oluştur.
  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return
      playerRef.current = new YT.Player(hostRef.current, {
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: (e) => {
            currentIdRef.current = now?.videoId || null
            if (now) e.target.loadVideoById(now.videoId)
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) onEndedRef.current?.()
          },
        },
      })
    })
    return () => {
      cancelled = true
      try {
        playerRef.current?.destroy()
      } catch {
        // yoksay
      }
      playerRef.current = null
    }
  }, [])

  // Kuyruğun başı değişince yeni videoyu yükle.
  useEffect(() => {
    const p = playerRef.current
    if (!p || !p.loadVideoById) return
    if (!now) {
      try {
        p.stopVideo()
      } catch {
        // yoksay
      }
      currentIdRef.current = null
      return
    }
    if (now.videoId !== currentIdRef.current) {
      currentIdRef.current = now.videoId
      p.loadVideoById(now.videoId)
    }
  }, [now?.videoId])

  // Oynat/duraklat senkronu.
  useEffect(() => {
    const p = playerRef.current
    if (!p || !p.playVideo) return
    if (isPlaying) p.playVideo()
    else p.pauseVideo()
  }, [isPlaying, now?.videoId])

  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
      <div ref={hostRef} className="w-full h-full" />
    </div>
  )
}
