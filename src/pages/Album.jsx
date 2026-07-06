import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { cldUrl, isCloudinaryConfigured, triggerDownload, uploadToCloudinary } from '../cloudinary.js'
import { addPhoto, deletePhoto, subscribePhotos } from '../lib/photos.js'

const rid = () =>
  (crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2))

export default function Album() {
  const { user, profile, admin } = useAuth()
  const [photos, setPhotos] = useState([])
  const [pending, setPending] = useState([]) // {id,url} yükleniyor
  const [localPrev, setLocalPrev] = useState({}) // id -> blobURL (pürüzsüz geçiş için)
  const [prog, setProg] = useState({ done: 0, total: 0 })
  const [viewer, setViewer] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const inputRef = useRef(null)

  const selectedRef = useRef(selected); selectedRef.current = selected
  const selectModeRef = useRef(selectMode); selectModeRef.current = selectMode
  const suppress = useRef(false)
  const press = useRef(null)
  const start = useRef({ x: 0, y: 0, id: null })
  const dir = useRef(null)
  const gridEl = useRef(null)

  useEffect(() => subscribePhotos(setPhotos), [])

  const photoIds = useMemo(() => new Set(photos.map((p) => p.id)), [photos])

  // Gerçek foto gelince (subscription) ilgili "pending" önizlemeyi temizle — çift/boşluk olmasın.
  useEffect(() => {
    setPending((p) => p.filter((x) => !photoIds.has(x.id)))
  }, [photoIds])

  const onGridMove = useCallback((e) => {
    if (!selectModeRef.current) return
    const t = e.touches[0]
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y
    if (dir.current === null && Math.hypot(dx, dy) > 8) {
      dir.current = Math.abs(dx) > Math.abs(dy) ? 'paint' : 'scroll'
    }
    if (dir.current === 'paint') {
      e.preventDefault()
      suppress.current = true
      const under = document.elementFromPoint(t.clientX, t.clientY)
      const pid = under?.closest('[data-pid]')?.dataset.pid
      if (pid && !selectedRef.current.has(pid)) {
        const n = new Set(selectedRef.current); n.add(pid); selectedRef.current = n; setSelected(n)
      }
    }
  }, [])

  const setGrid = useCallback((el) => {
    if (gridEl.current) gridEl.current.removeEventListener('touchmove', onGridMove)
    gridEl.current = el
    if (el) el.addEventListener('touchmove', onGridMove, { passive: false })
  }, [onGridMove])

  if (!isCloudinaryConfigured) {
    return (
      <div className="card p-6 text-center">
        <div className="text-5xl mb-3">📸</div>
        <h1 className="font-display text-xl font-bold gold-text">Albüm kuruluma hazır</h1>
        <p className="mt-2 text-slate-300 text-sm">Cloudinary ayarları henüz girilmedi.</p>
      </div>
    )
  }

  const uploadOne = async (file) => {
    const id = rid()
    const localUrl = URL.createObjectURL(file)
    setPending((p) => [{ id, url: localUrl }, ...p])
    setLocalPrev((m) => ({ ...m, [id]: localUrl }))
    try {
      const r = await uploadToCloudinary(file)
      await addPhoto({
        id, publicId: r.public_id, url: r.secure_url, width: r.width, height: r.height,
        uid: user.uid, name: profile.name, familyId: profile.familyId,
      })
    } catch {
      setPending((p) => p.filter((x) => x.id !== id))
      setLocalPrev((m) => { const n = { ...m }; delete n[id]; URL.revokeObjectURL(localUrl); return n })
    }
    setProg((p) => {
      const done = p.done + 1
      return done >= p.total ? { done: 0, total: 0 } : { ...p, done }
    })
  }

  const onFiles = (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setProg((p) => ({ done: p.done, total: p.total + files.length }))
    files.forEach(uploadOne)
  }

  const revealLoaded = (id) => {
    // Gerçek küçük resim yüklendi -> yerel önizlemeyi bırak (bellek).
    setLocalPrev((m) => {
      if (!m[id]) return m
      URL.revokeObjectURL(m[id])
      const n = { ...m }; delete n[id]; return n
    })
  }

  const tap = (id, index) => {
    if (selectMode) {
      const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n)
    } else setViewer(index)
  }
  const onTouchStart = (e, id) => {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY, id }
    dir.current = null
    if (!selectModeRef.current) {
      press.current = setTimeout(() => {
        suppress.current = true; setSelectMode(true)
        const n = new Set(selectedRef.current); n.add(id); setSelected(n)
      }, 400)
    }
  }
  const onTouchEnd = () => { clearTimeout(press.current); dir.current = null }

  const exitSelect = () => { setSelectMode(false); setSelected(new Set()) }
  const downloadSelected = () =>
    photos.filter((p) => selected.has(p.id))
      .forEach((p, i) => setTimeout(() => triggerDownload(p.publicId, p.uploaderName), i * 350))
  const deleteSelected = () => {
    const list = photos.filter((p) => selected.has(p.id) && (admin || p.uploaderUid === user.uid))
    if (!list.length) return
    if (!confirm(`${list.length} fotoğraf silinsin mi?`)) return
    list.forEach((p) => deletePhoto(p.id)); exitSelect()
  }

  const pendingShow = pending.filter((p) => !photoIds.has(p.id))
  const uploadingCount = pendingShow.length

  return (
    <div className="space-y-4">
      {selectMode ? (
        <div className="flex items-center gap-2">
          <span className="font-display font-bold flex-1">{selected.size} seçili</span>
          <button onClick={downloadSelected} disabled={!selected.size} className="btn-gold px-3 py-2 text-sm">⬇️ İndir</button>
          <button onClick={deleteSelected} disabled={!selected.size} className="btn-ghost px-3 py-2 text-sm">🗑️ Sil</button>
          <button onClick={exitSelect} className="text-slate-400 text-sm px-1">Vazgeç</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-bold">📸 Albüm</h1>
            <p className="text-slate-400 text-sm">{photos.length} fotoğraf</p>
          </div>
          <div className="flex items-center gap-2">
            {photos.length > 0 && (
              <button onClick={() => setSelectMode(true)} className="btn-ghost px-3 py-2.5 text-sm">Seç</button>
            )}
            <button onClick={() => inputRef.current?.click()} className="btn-gold px-4 py-2.5">➕ Foto</button>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />

      {prog.total > 0 && (
        <div className="card p-3">
          <div className="flex justify-between text-xs text-slate-300 mb-1.5">
            <span>Yükleniyor…</span>
            <span className="tabular-nums">{prog.done}/{prog.total}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all"
              style={{ width: `${(prog.done / prog.total) * 100}%` }} />
          </div>
        </div>
      )}

      {photos.length === 0 && uploadingCount === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <div className="text-4xl mb-2">🖼️</div>
          Henüz fotoğraf yok. İlk anıyı sen ekle!
        </div>
      ) : (
        <div ref={setGrid} className="grid grid-cols-3 gap-1.5">
          {pendingShow.map((p) => (
            <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-white/5">
              <img src={p.url} alt="" className="w-full h-full object-cover opacity-70" />
              <span className="absolute inset-0 grid place-items-center bg-black/20">
                <span className="w-6 h-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              </span>
            </div>
          ))}
          {photos.map((p, index) => {
            const sel = selected.has(p.id)
            const bg = localPrev[p.id] || cldUrl(p.publicId, 'w_24,e_blur:1000,q_1,f_auto')
            return (
              <button
                key={p.id}
                data-pid={p.id}
                onTouchStart={(e) => onTouchStart(e, p.id)}
                onTouchEnd={onTouchEnd}
                onClick={() => { if (suppress.current) { suppress.current = false; return } tap(p.id, index) }}
                className="relative aspect-square rounded-lg overflow-hidden bg-center bg-cover"
                style={{ backgroundImage: `url("${bg}")` }}
              >
                <img
                  src={cldUrl(p.publicId, 'w_400,h_400,c_fill,q_auto,f_auto')}
                  alt=""
                  loading="lazy"
                  onLoad={(e) => { e.currentTarget.style.opacity = 1; revealLoaded(p.id) }}
                  className="w-full h-full object-cover pointer-events-none opacity-0 transition-opacity duration-300"
                />
                {selectMode && (
                  <span className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full grid place-items-center text-xs border-2 ${
                    sel ? 'bg-gold-400 border-gold-400 text-night-950' : 'bg-black/30 border-white/70 text-transparent'
                  }`}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {!selectMode && photos.length > 0 && (
        <p className="text-center text-xs text-slate-600">
          İpucu: bir fotoğrafa uzun bas → seçim modu; parmağını yatay sürükleyerek çoklu seç.
        </p>
      )}

      {viewer !== null && (
        <Viewer photos={photos} index={viewer} setIndex={setViewer} user={user} admin={admin} onClose={() => setViewer(null)} />
      )}
    </div>
  )
}

function Viewer({ photos, index, setIndex, user, admin, onClose }) {
  const photo = photos[index]
  const touchX = useRef(null)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(photos.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, setIndex, onClose])

  if (!photo) return null
  const go = (d) => { const ni = index + d; if (ni >= 0 && ni < photos.length) setIndex(ni) }
  const canDelete = admin || photo.uploaderUid === user.uid

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-3 text-sm text-slate-300" onClick={(e) => e.stopPropagation()}>
        <span>{index + 1} / {photos.length}</span>
        <span className="truncate mx-2 flex-1 text-center">{photo.uploaderName}</span>
        <button onClick={onClose} className="text-slate-300 px-2">✕</button>
      </div>
      <div
        className="flex-1 min-h-0 flex items-center justify-center relative"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (dx < -40) go(1); else if (dx > 40) go(-1)
          touchX.current = null
        }}
      >
        {index > 0 && <button onClick={() => go(-1)} className="absolute left-1 top-1/2 -translate-y-1/2 text-white/70 text-4xl px-2">‹</button>}
        <img src={cldUrl(photo.publicId, 'q_auto:good,f_auto,w_1600,c_limit')} alt="" className="max-w-full max-h-full object-contain select-none" />
        {index < photos.length - 1 && <button onClick={() => go(1)} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/70 text-4xl px-2">›</button>}
      </div>
      <div className="flex items-center justify-center gap-6 p-4 pb-safe" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => triggerDownload(photo.publicId, photo.uploaderName)} className="btn-gold px-5 py-2.5">⬇️ İndir</button>
        {canDelete && (
          <button
            onClick={() => {
              if (confirm('Bu fotoğraf silinsin mi?')) {
                deletePhoto(photo.id)
                if (photos.length <= 1) onClose()
                else if (index >= photos.length - 1) setIndex(index - 1)
              }
            }}
            className="btn-ghost px-5 py-2.5"
          >🗑️ Sil</button>
        )}
      </div>
    </div>
  )
}
