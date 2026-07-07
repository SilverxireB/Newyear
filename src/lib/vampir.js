import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

const GAME = () => doc(db, 'vampir', 'current')
const roleRef = (uid) => doc(db, 'vampir', 'current', 'roles', uid)

export function subscribeGame(cb) {
  return onSnapshot(GAME(), (snap) => cb(snap.exists() ? snap.data() : null))
}

// Kişi yalnızca KENDİ rolünü okuyabilir (gizlilik Firestore kuralıyla korunur).
export function subscribeMyRole(uid, cb) {
  return onSnapshot(roleRef(uid), (snap) => cb(snap.exists() ? snap.data() : null))
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Önceki oyuncuların uid'lerini oyun dokümanından oku (koleksiyon sorgusu YAPMA - kural reddeder).
async function prevPlayerUids() {
  const snap = await getDoc(GAME())
  return snap.exists() ? (snap.data().players || []).map((p) => p.uid) : []
}

// Rolleri dağıt: vampCount kişi vampir, gerisi köylü.
export async function dealRoles({ players, vampCount, hostUid, hostName }) {
  const prev = await prevPlayerUids()
  const shuffled = shuffle(players)
  const vampirs = shuffled.slice(0, vampCount)

  const batch = writeBatch(db)
  // eski oyuncuların rollerini tek tek sil (uid ile, sorgusuz)
  prev.forEach((uid) => batch.delete(roleRef(uid)))
  // yeni roller
  shuffled.forEach((p, i) => {
    if (i < vampCount) {
      const mates = vampirs.filter((v) => v.uid !== p.uid).map((v) => v.name)
      batch.set(roleRef(p.uid), { role: 'vampir', mates })
    } else {
      batch.set(roleRef(p.uid), { role: 'koylu', mates: [] })
    }
  })
  await batch.commit()

  await setDoc(GAME(), {
    status: 'dealt',
    players: players.map((p) => ({ uid: p.uid, name: p.name })),
    vampCount,
    hostUid,
    hostName,
    round: Date.now() % 100000,
    dealtAt: serverTimestamp(),
  })
}

export async function resetGame() {
  const prev = await prevPlayerUids()
  if (prev.length) {
    const batch = writeBatch(db)
    prev.forEach((uid) => batch.delete(roleRef(uid)))
    await batch.commit()
  }
  await setDoc(GAME(), { status: 'idle', players: [], vampCount: 0 })
}
