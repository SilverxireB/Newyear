import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  cldUrl,
  compressImage,
  isCloudinaryConfigured,
  uploadToCloudinary,
} from '../cloudinary.js'
import { addPhoto, deletePhoto, subscribePhotos } from '../lib/photos.js'

export default function Album() {
  const { user, profile, admin } = useAuth()
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(null) // {done,total}
  const [lightbox, setLightbox] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => subscribePhotos(setPhotos), [])

  if (!isCloudinaryConfigured) {
    return (
      <div className="card p-6 text-center">
        <div className="text-5xl mb-3">📸</div>
        <h1 className="font-display text-xl font-bold gold-text">Albüm kuruluma hazır</h1>
        <p className="mt-2 text-slate-300 text-sm">
          Fotoğraflar için Cloudinary ayarları henüz girilmedi. Cloud name + upload preset
          eklenince albüm açılacak.
        </p>
      </div>
    )
  }

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setUploading({ done: 0, total: files.length })
    for (const file of files) {
      try {
        const blob = (await compressImage(file)) || file
        const r = await uploadToCloudinary(blob)
        await addPhoto({
          publicId: r.public_id,
          url: r.secure_url,
          width: r.width,
          height: r.height,
          uid: user.uid,
          name: profile.name,
          familyId: profile.familyId,
        })
      } catch {
        // bu fotoğrafı atla
      }
      setUploading((u) => ({ ...u, done: u.done + 1 }))
    }
    setUploading(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">📸 Albüm</h1>
          <p className="text-slate-400 text-sm">{photos.length} fotoğraf</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={!!uploading}
          className="btn-gold px-4 py-2.5"
        >
          {uploading ? `Yükleniyor ${uploading.done}/${uploading.total}` : '➕ Fotoğraf'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFiles}
        />
      </div>

      {photos.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <div className="text-4xl mb-2">🖼️</div>
          Henüz fotoğraf yok. İlk anıyı sen ekle!
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setLightbox(p)}
              className="relative aspect-square rounded-lg overflow-hidden bg-white/5"
            >
              <img
                src={cldUrl(p.publicId, 'w_400,h_400,c_fill,q_auto,f_auto')}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <Lightbox
          photo={lightbox}
          canDelete={admin || lightbox.uploaderUid === user.uid}
          onDelete={() => {
            deletePhoto(lightbox.id)
            setLightbox(null)
          }}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}

function Lightbox({ photo, canDelete, onDelete, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <img
        src={cldUrl(photo.publicId, 'q_auto,f_auto,w_1400,c_limit')}
        alt=""
        className="max-w-full max-h-[80vh] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="mt-3 flex items-center gap-4 text-sm text-slate-300">
        <span>ekleyen: {photo.uploaderName}</span>
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Bu fotoğraf albümden silinsin mi?')) onDelete()
            }}
            className="text-rose-400"
          >
            Sil
          </button>
        )}
        <button onClick={onClose} className="text-slate-400">
          Kapat
        </button>
      </div>
    </div>
  )
}
