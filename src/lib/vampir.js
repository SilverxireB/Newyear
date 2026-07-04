import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

const GAME = () => doc(db, 'vampir', 'current')
const ROLES = () => collection(db, 'vampir', 'current', 'roles')

export function subscribeGame(cb) {
  return onSnapshot(GAME(), (snap) => cb(snap.exists() ? snap.data() : null))
}

// Kişi yalnızca KENDİ rolünü okuyabilir (gizlilik Firestore kuralıyla korunur).
export function subscribeMyRole(uid, cb) {
  return onSnapshot(doc(db, 'vampir', 'current', 'roles', uid), (snap) =>
    cb(snap.exists() ? snap.data() : null),
  )
}

async function clearRoles() {
  const snap = await getDocs(ROLES())
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Rolleri dağıt: vampCount kişi vampir, gerisi köylü.
export async function dealRoles({ players, vampCount, hostUid, hostName }) {
  await clearRoles()
  const shuffled = shuffle(players)
  const vampirs = shuffled.slice(0, vampCount)
  const batch = writeBatch(db)
  shuffled.forEach((p, i) => {
    if (i < vampCount) {
      // Vampir kendi kartında diğer vampirleri de görür (birbirlerini tanısınlar).
      const mates = vampirs.filter((v) => v.uid !== p.uid).map((v) => v.name)
      batch.set(doc(db, 'vampir', 'current', 'roles', p.uid), { role: 'vampir', mates })
    } else {
      batch.set(doc(db, 'vampir', 'current', 'roles', p.uid), { role: 'koylu', mates: [] })
    }
  })
  await batch.commit()

  await setDoc(GAME(), {
    status: 'dealt',
    players: players.map((p) => ({ uid: p.uid, name: p.name })),
    vampCount,
    hostUid,
    hostName,
    round: (Date.now() % 100000),
    dealtAt: serverTimestamp(),
  })
}

export async function resetGame() {
  await clearRoles()
  await setDoc(GAME(), { status: 'idle', players: [], vampCount: 0 })
}
