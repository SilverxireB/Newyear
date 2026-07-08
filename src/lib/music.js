import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
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

// Çalınan / atlanan şarkıyı geçmişe taşı. counted=true ise "dinlendi" sayılır
// (çalma sayısı + ekleyene puan artar); atlamada counted=false (sadece arşiv).
export async function recordPlay(item, counted) {
  if (!item?.videoId) return
  const base = {
    videoId: item.videoId,
    title: item.title || 'YouTube videosu',
    thumbnail: item.thumbnail || '',
    author: item.author || '',
    lastByUid: item.addedByUid || null,
    lastByName: item.addedByName || '',
    lastPlayedAt: Date.now(),
  }
  if (counted) {
    await setDoc(doc(db, 'history', item.videoId), { ...base, playCount: increment(1) }, { merge: true })
    if (item.addedByUid) {
      await setDoc(
        doc(db, 'music', 'stats'),
        { byUser: { [item.addedByUid]: { name: item.addedByName || 'biri', plays: increment(1) } } },
        { merge: true },
      )
    }
  } else {
    // Sadece arşivle; çalma sayısına dokunma (yoksa oluştur).
    await setDoc(doc(db, 'history', item.videoId), { ...base, playCount: increment(0) }, { merge: true })
  }
}

// Çalınmış şarkılar (geçmiş) — en son çalınan üstte.
export function subscribeHistory(cb, onError) {
  return onSnapshot(
    collection(db, 'history'),
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      items.sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
      cb(items)
    },
    (err) => onError && onError(err),
  )
}

// DJ istatistiği: kimin şarkıları kaç kez dinlenmiş.
export function subscribeStats(cb) {
  return onSnapshot(doc(db, 'music', 'stats'), (snap) => {
    const by = snap.exists() ? snap.data().byUser || {} : {}
    const rows = Object.entries(by)
      .map(([uid, v]) => ({ uid, name: v.name || 'biri', plays: v.plays || 0 }))
      .filter((r) => r.plays > 0)
      .sort((a, b) => b.plays - a.plays)
    cb(rows)
  })
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

// Çalan cihaz konumunu yayınlar; diğer cihazlar ilerleme çubuğunu buradan çizer.
export async function updatePlayback({ posT, posDur, isPlaying }) {
  await setDoc(
    doc(db, 'music', 'state'),
    { posT: posT || 0, posDur: posDur || 0, posAt: Date.now(), isPlaying: isPlaying !== false },
    { merge: true },
  )
}

// Herhangi bir cihazdan sarma isteği; çalan cihaz uygular.
export async function requestSeek(seconds) {
  await setDoc(
    doc(db, 'music', 'state'),
    { seekReq: Math.max(0, Math.floor(seconds)), seekReqAt: Date.now() },
    { merge: true },
  )
}

// YouTube / YouTube Music linkinden TEK şarkının video kimliğini çıkar.
// Listedeki (list=) parametre yok sayılır → sadece o şarkı eklenir.
const isVideoId = (x) => /^[\w-]{11}$/.test(x || '')

export function parseYouTube(input) {
  if (!input) return null
  const s = input.trim()
  if (isVideoId(s)) return s
  try {
    const u = new URL(s)
    const host = u.hostname.replace('www.', '')
    // youtu.be/<id>
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1, 12)
      return isVideoId(id) ? id : null
    }
    // youtube.com, music.youtube.com, m.youtube.com → hepsi ...youtube.com
    if (host.endsWith('youtube.com')) {
      const v = (u.searchParams.get('v') || '').slice(0, 11)
      if (isVideoId(v)) return v
      const parts = u.pathname.split('/').filter(Boolean)
      const i = parts.findIndex((p) => ['shorts', 'embed', 'v', 'live'].includes(p))
      if (i >= 0 && parts[i + 1]) {
        const id = parts[i + 1].slice(0, 11)
        return isVideoId(id) ? id : null
      }
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
