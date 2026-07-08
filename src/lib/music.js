import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

// Ortak müzik kuyruğu: FIFO. Sıradaki her zaman kuyruğun ilk elemanı.
// Sıralama istemci tarafında yapılır (serverTimestamp pending durumunda
// yeni kaydın anında görünmemesi sorununu önler).
export function subscribeQueue(cb, onError) {
  return onSnapshot(
    collection(db, 'queue'),
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      items.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0))
      cb(items)
    },
    (err) => {
      if (onError) onError(err)
    },
  )
}

export async function addToQueue({ videoId, title, thumbnail, author, uid, name }) {
  await addDoc(collection(db, 'queue'), {
    videoId,
    title: title || 'YouTube videosu',
    thumbnail: thumbnail || '',
    author: author || '',
    addedByUid: uid,
    addedByName: name || '',
    addedAt: Date.now(), // istemci sırası (güvenilir)
    createdAt: serverTimestamp(),
  })
}

export async function removeFromQueue(id) {
  await deleteDoc(doc(db, 'queue', id))
}

// Çalma durumu (oynat/duraklat) tüm cihazlarda ortak.
export function subscribeMusicState(cb) {
  return onSnapshot(doc(db, 'music', 'state'), (snap) => {
    cb(snap.exists() ? snap.data() : { isPlaying: true })
  })
}

export async function setPlaying(isPlaying) {
  await setDoc(doc(db, 'music', 'state'), { isPlaying, updatedAt: serverTimestamp() }, { merge: true })
}

// YouTube linkinden video kimliği çıkar.
export function parseYouTube(input) {
  if (!input) return null
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const u = new URL(s)
    const host = u.hostname.replace('www.', '')
    if (host === 'youtu.be') return u.pathname.slice(1, 12) || null
    if (host.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v.slice(0, 11)
      const parts = u.pathname.split('/').filter(Boolean)
      const i = parts.findIndex((p) => ['shorts', 'embed', 'v', 'live'].includes(p))
      if (i >= 0 && parts[i + 1]) return parts[i + 1].slice(0, 11)
    }
  } catch {
    // geçersiz URL
  }
  return null
}

// Başlık + kapak: oEmbed (anahtar gerektirmez, CORS açık). Başarısızsa varsayılan kapak.
export async function fetchYouTubeMeta(videoId) {
  const thumb = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
    )
    if (res.ok) {
      const j = await res.json()
      return { title: j.title, thumbnail: j.thumbnail_url || thumb, author: j.author_name || '' }
    }
  } catch {
    // sessiz geç
  }
  return { title: 'YouTube videosu', thumbnail: thumb, author: '' }
}

// YouTube IFrame API'yi bir kez yükle.
let ytApiPromise
export function loadYouTubeApi() {
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev()
      resolve(window.YT)
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return ytApiPromise
}
