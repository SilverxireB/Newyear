import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  addToQueue,
  fetchYouTubeMeta,
  loadYouTubeApi,
  parseYouTube,
  recordPlay,
  removeFromQueue,
  requestSeek,
  setPlaying,
  subscribeHistory,
  subscribeMusicState,
  subscribeQueue,
  subscribeStats,
  updatePlayback,
} from '../lib/music.js'
import { useWakeLock } from '../lib/wakeLock.js'

// saniye → dk:sn
function fmt(sec) {
  if (!sec || sec < 0 || !isFinite(sec)) return '0:00'
  const s = Math.floor(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}


export default function Music() {
  const { profile, user, admin } = useAuth()
  const uid = user?.uid
  const [queue, setQueue] = useState([])
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState([])
  const [state, setState] = useState({ isPlaying: true })
  const [isPlayer, setIsPlayer] = useState(false)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [qError, setQError] = useState('')
  const [pos, setPos] = useState({ t: 0, dur: 0 }) // çalan cihazın canlı konumu
  const [, setTick] = useState(0) // saniyede bir yeniden çiz (ilerleme çubuğu)
  const seekRef = useRef(null)
  const lastWriteRef = useRef(0)

  useEffect(() => {
    const u1 = subscribeQueue(setQueue, (e) => setQError(e?.code || e?.message || 'okuma hatası'))
    const u2 = subscribeMusicState(setState)
    const u3 = subscribeHistory(setHistory)
    const u4 = subscribeStats(setStats)
    const clock = setInterval(() => setTick((n) => n + 1), 1000)
    return () => {
      u1()
      u2()
      u3()
      u4()
      clearInterval(clock)
    }
  }, [])

  const now = queue[0] || null
  const upNext = queue.slice(1)
  const isPlaying = state.isPlaying !== false

  // İlerleme: çalan cihaz kendi canlı değerini, diğerleri yayınlanan konumu (ara değerli) kullanır.
  let curT = 0
  let curDur = 0
  if (isPlayer) {
    curT = pos.t
    curDur = pos.dur
  } else {
    curDur = state.posDur || 0
    curT = state.posT || 0
    if (isPlaying && state.posAt) curT += (Date.now() - state.posAt) / 1000
    if (curDur) curT = Math.min(curT, curDur)
  }

  // Çalan cihazdan konum bilgisi (çalarken 2 sn'de bir yayınla; duraklatınca yazma).
  const onProgress = ({ t, dur }) => {
    setPos({ t, dur })
    if (!isPlaying) return
    const nowMs = Date.now()
    if (nowMs - lastWriteRef.current >= 2000) {
      lastWriteRef.current = nowMs
      updatePlayback({ posT: t, posDur: dur, isPlaying: true }).catch(() => {})
    }
  }

  const onSeek = (target) => {
    if (isPlayer) setPos((p) => ({ ...p, t: target }))
    if (isPlayer && seekRef.current) seekRef.current(target)
    else requestSeek(target)
  }

  const topSongs = useMemo(
    () => [...history].filter((h) => (h.playCount || 0) > 0).sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 5),
    [history],
  )

  const add = async (url) => {
    const raw = url ?? input
    const videoId = parseYouTube(raw)
    if (!videoId) {
      alert('Tek şarkı linki yapıştır (YouTube ya da YouTube Music). Liste/playlist linki değil.')
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

  // Kuyruktan çıkar (atla ya da bitti). Skor 2/3'te ayrıca sayılır.
  const advance = async (item) => {
    if (!item) return
    await recordPlay(item, false) // geçmişe arşivle, çalma sayısına dokunma
    await removeFromQueue(item.id)
  }
  const skip = () => advance(now)

  // Şarkının 2/3'ü çalındığında ekleyene puan yaz (video başına bir kez).
  const credit = (item) => recordPlay(item, true)

  const requeue = (item) => {
    add(item.videoId)
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
      <div className="card p-3 space-y-2">
        <div className="flex gap-2">
          <input
            className="input py-2.5 flex-1"
            placeholder="YouTube / YT Music linki yapıştır…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            inputMode="url"
          />
          <button onClick={() => add()} disabled={adding} className="btn-gold px-4 text-sm shrink-0">
            {adding ? '…' : 'Ekle'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Tek şarkı linki ekle — liste/playlist paylaşırsan sadece o an açık olan şarkı eklenir.
        </p>
      </div>

      {/* Şimdi çalıyor — müzik kartı */}
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

        {now && (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {now.thumbnail ? (
                <img src={now.thumbnail} alt="" className="w-20 h-20 rounded-xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-night-900 grid place-items-center text-3xl">🎵</div>
              )}
              {isPlayer && isPlaying && (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="eq"><i /><i /><i /><i /></span>
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm line-clamp-2">{now.title}</div>
              <div className="text-xs text-slate-500">{now.author}</div>
              <div className="text-[11px] text-slate-500 mt-1">Ekleyen: {now.addedByName || 'biri'}</div>
            </div>
          </div>
        )}

        {now && (
          <div className="space-y-1">
            <div className="relative pt-3">
              {curDur > 0 && (
                <span
                  className="pointer-events-none absolute top-0 text-[11px] leading-none"
                  style={{ left: '66.6%', transform: 'translateX(-50%)', opacity: curT / curDur >= 2 / 3 ? 1 : 0.4 }}
                  title="Buraya gelince şarkıyı ekleyene DJ puanı yazılır"
                >
                  🏆
                </span>
              )}
              <input
                type="range"
                min={0}
                max={curDur || 0}
                value={Math.min(curT, curDur || 0)}
                step="1"
                onChange={(e) => onSeek(Number(e.target.value))}
                disabled={!curDur}
                className="w-full accent-gold-500 h-1.5"
                aria-label="İlerleme"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
              <span>{fmt(curT)}</span>
              <span>{curDur ? fmt(curDur) : '–:––'}</span>
            </div>
          </div>
        )}

        {now && (
          <div className="flex items-center gap-2">
            <button onClick={() => onSeek(Math.max(0, curT - 10))} disabled={!curDur} className="btn-ghost px-3 py-2.5 text-sm">
              ⏪
            </button>
            <button onClick={() => setPlaying(!isPlaying)} className="btn-ghost flex-1 py-2.5 text-sm">
              {isPlaying ? '⏸ Duraklat' : '▶️ Devam'}
            </button>
            <button onClick={() => onSeek(curT + 10)} disabled={!curDur} className="btn-ghost px-3 py-2.5 text-sm">
              ⏩
            </button>
            <button onClick={skip} className="btn-ghost flex-1 py-2.5 text-sm">
              ⏭ Atla
            </button>
          </div>
        )}

        {now && !isPlayer && (
          <p className="text-[11px] text-amber-300/80 text-center">
            Ses çıkması için hoparlöre bağlı bir cihazda “Bu cihazda çal” aç.
          </p>
        )}

        {/* Gizli oynatıcı: video görünmez, sadece ses. */}
        {now && isPlayer && (
          <PlayerEngine
            now={now}
            isPlaying={isPlaying}
            onEnded={() => advance(now)}
            onCredit={credit}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onNext={() => advance(now)}
            onProgress={onProgress}
            seekRef={seekRef}
            seekReq={state.seekReq}
            seekReqAt={state.seekReqAt}
          />
        )}
      </section>

      {/* Sırada */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-sm text-slate-300">Sırada ({upNext.length})</h2>
          {admin && upNext.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Sıradaki tüm şarkıları kaldır?')) upNext.forEach((it) => removeFromQueue(it.id))
              }}
              className="text-xs text-rose-400/80"
            >
              Temizle
            </button>
          )}
        </div>
        {upNext.length === 0 && <p className="text-slate-500 text-sm px-1">Sırada başka şarkı yok.</p>}
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

      {/* Çalınanlar (geçmiş) — tekrar eklenebilir */}
      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display font-bold text-sm text-slate-300 px-1">Çalınanlar ({history.length})</h2>
          {history.slice(0, 30).map((h) => (
            <div key={h.id} className="card p-2.5 flex items-center gap-3">
              {h.thumbnail && <img src={h.thumbnail} alt="" className="w-16 h-10 rounded object-cover shrink-0 opacity-80" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{h.title}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {h.playCount > 0 ? `${h.playCount} kez çalındı` : 'atlandı'} · son: {h.lastByName || 'biri'}
                </div>
              </div>
              <button onClick={() => requeue(h)} className="btn-ghost px-2.5 py-1.5 text-xs shrink-0">
                🔁 Tekrar
              </button>
            </div>
          ))}
        </section>
      )}

      {/* DJ sıralaması */}
      <section className="card p-4">
        <h2 className="font-display font-bold mb-3">🏆 DJ Sıralaması</h2>
        {stats.length > 0 ? (
          <ul className="space-y-2">
            {stats.slice(0, 8).map((r, i) => (
              <li key={r.uid} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-center">{['🥇', '🥈', '🥉'][i] || i + 1}</span>
                <span className="flex-1 truncate">{r.name}</span>
                <span className="text-slate-400">{r.plays} dinlenme</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 text-sm">
            Henüz kimse yok. Bir şarkının <b>2/3'ü çalınca</b> ekleyen kişi buraya düşer — en çok
            dinlenen şarkıları koyan kazanır.
          </p>
        )}
      </section>

      {/* En çok çalınanlar */}
      {topSongs.length > 0 && (
        <section className="card p-4">
          <h2 className="font-display font-bold mb-3">🔥 En Çok Çalınanlar</h2>
          <ul className="space-y-2">
            {topSongs.map((h) => (
              <li key={h.id} className="flex items-center gap-3">
                {h.thumbnail && <img src={h.thumbnail} alt="" className="w-12 h-8 rounded object-cover shrink-0" />}
                <span className="flex-1 text-sm truncate">{h.title}</span>
                <span className="text-xs text-gold-300 shrink-0">×{h.playCount}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <style>{`
        .eq { display: flex; align-items: flex-end; gap: 2px; height: 18px; }
        .eq i { width: 3px; background: #f7d066; border-radius: 2px; animation: eq 0.9s ease-in-out infinite; }
        .eq i:nth-child(1) { animation-delay: 0s; }
        .eq i:nth-child(2) { animation-delay: 0.2s; }
        .eq i:nth-child(3) { animation-delay: 0.4s; }
        .eq i:nth-child(4) { animation-delay: 0.15s; }
        @keyframes eq { 0%, 100% { height: 5px; } 50% { height: 16px; } }
        @media (prefers-reduced-motion: reduce) { .eq i { animation: none; height: 10px; } }
      `}</style>
    </div>
  )
}

// YouTube ses motoru — ekran dışında, görünmez. Sadece müzik çalar.
function PlayerEngine({ now, isPlaying, onEnded, onCredit, onPlay, onPause, onNext, onProgress, seekRef, seekReq, seekReqAt }) {
  const hostRef = useRef(null)
  const playerRef = useRef(null)
  const currentIdRef = useRef(null)
  const creditedRef = useRef(null) // puan verilmiş kuyruk öğesinin id'si
  const lastSeekRef = useRef(0)
  const onEndedRef = useRef(onEnded)
  const onCreditRef = useRef(onCredit)
  const onPlayRef = useRef(onPlay)
  const onPauseRef = useRef(onPause)
  const onNextRef = useRef(onNext)
  const onProgressRef = useRef(onProgress)
  const nowRef = useRef(now)
  const isPlayingRef = useRef(isPlaying)
  onEndedRef.current = onEnded
  onCreditRef.current = onCredit
  onPlayRef.current = onPlay
  onPauseRef.current = onPause
  onNextRef.current = onNext
  onProgressRef.current = onProgress
  nowRef.current = now
  isPlayingRef.current = isPlaying

  // Ekranı uyanık tut → çalan cihazda müzik kesilmesin.
  useWakeLock(true)

  // Oynatıcıyı bir kez oluştur + her saniye ilerlemeyi kontrol et (2/3 → puan).
  useEffect(() => {
    let cancelled = false
    let poll
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return
      playerRef.current = new YT.Player(hostRef.current, {
        width: '320',
        height: '180',
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: (e) => {
            currentIdRef.current = nowRef.current?.videoId || null
            try {
              e.target.setPlaybackQuality('small')
            } catch {
              // yoksay
            }
            if (seekRef) seekRef.current = (sec) => {
              try {
                e.target.seekTo(sec, true)
              } catch {
                // yoksay
              }
            }
            if (nowRef.current) e.target.loadVideoById(nowRef.current.videoId)
          },
          onStateChange: (e) => {
            const YT = window.YT
            if (e.data === YT.PlayerState.ENDED) {
              onEndedRef.current?.()
              return
            }
            // Arka plana düşünce tarayıcının otomatik duraklatmasını geri al
            // (kullanıcı gerçekten duraklattıysa isPlaying zaten false olur).
            if (e.data === YT.PlayerState.PAUSED && isPlayingRef.current) {
              const p = playerRef.current
              if (p && p.playVideo) {
                try {
                  p.playVideo()
                } catch {
                  // yoksay
                }
              }
            }
          },
        },
      })
      poll = setInterval(() => {
        const p = playerRef.current
        const item = nowRef.current
        if (!p || !p.getCurrentTime || !item) return
        const dur = p.getDuration ? p.getDuration() : 0
        const t = p.getCurrentTime()
        // İlerlemeyi yayınla (çubuk için).
        onProgressRef.current?.({ t, dur })
        // Bildirim/kilit ekranındaki ilerleme çubuğuna gerçek konumu yaz.
        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && dur > 0) {
          try {
            navigator.mediaSession.setPositionState({ duration: dur, position: Math.min(t, dur), playbackRate: 1 })
          } catch {
            // yoksay
          }
        }
        // 2/3 → ekleyene puan (video başına bir kez).
        if (creditedRef.current !== item.id && dur > 0 && t / dur >= 2 / 3) {
          creditedRef.current = item.id
          onCreditRef.current?.(item)
        }
      }, 1000)
    })
    return () => {
      cancelled = true
      if (poll) clearInterval(poll)
      if (seekRef) seekRef.current = null
      try {
        playerRef.current?.destroy()
      } catch {
        // yoksay
      }
      playerRef.current = null
    }
  }, [])

  // Başka cihazdan gelen sarma isteğini uygula.
  useEffect(() => {
    if (!seekReqAt || seekReqAt === lastSeekRef.current) return
    lastSeekRef.current = seekReqAt
    const p = playerRef.current
    if (p && p.seekTo && typeof seekReq === 'number') {
      try {
        p.seekTo(seekReq, true)
      } catch {
        // yoksay
      }
    }
  }, [seekReqAt, seekReq])

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
  }, [now?.videoId, now?.id])

  // Oynat/duraklat senkronu.
  useEffect(() => {
    const p = playerRef.current
    if (!p || !p.playVideo) return
    if (isPlaying) p.playVideo()
    else p.pauseVideo()
  }, [isPlaying, now?.videoId])

  // Sekmeye dönünce çalması gerekiyorsa devam ettir.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      const p = playerRef.current
      if (p && p.playVideo && isPlayingRef.current) {
        try {
          p.playVideo()
        } catch {
          // yoksay
        }
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Medya oturumu: bildirim / kilit ekranı kontrolleri + arka planda çalma.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !now) return
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: now.title || 'Müzik',
        artist: now.author || 'Newyear Traitors',
        album: 'Newyear Traitors 🎵',
        artwork: [
          { src: `https://img.youtube.com/vi/${now.videoId}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' },
          { src: `https://img.youtube.com/vi/${now.videoId}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
        ],
      })
    } catch {
      // yoksay
    }
  }, [now?.videoId, now?.title])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    } catch {
      // yoksay
    }
  }, [isPlaying])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return undefined
    const set = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // desteklenmeyen aksiyon
      }
    }
    set('play', () => onPlayRef.current?.())
    set('pause', () => onPauseRef.current?.())
    set('nexttrack', () => onNextRef.current?.())
    return () => {
      set('play', null)
      set('pause', null)
      set('nexttrack', null)
    }
  }, [])

  // Ekran dışında ama gerçek boyutta render → ses kesintisiz, video görünmez.
  return (
    <div aria-hidden="true" style={{ position: 'fixed', left: -9999, top: 0, width: 320, height: 180, opacity: 0, pointerEvents: 'none' }}>
      <div ref={hostRef} />
    </div>
  )
}
