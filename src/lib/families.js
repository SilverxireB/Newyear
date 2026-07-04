import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

// Başlangıç için 4 aile. İsimler yönetici tarafından değiştirilebilir.
export const DEFAULT_FAMILIES = [
  { id: 'aile-1', name: '1. Aile', color: '#f7d066', order: 1 },
  { id: 'aile-2', name: '2. Aile', color: '#ef5a78', order: 2 },
  { id: 'aile-3', name: '3. Aile', color: '#4ade80', order: 3 },
  { id: 'aile-4', name: '4. Aile', color: '#60a5fa', order: 4 },
]

// Aileler yoksa varsayılan 4 aileyi oluştur (tek seferlik, ilk açılışta).
export async function ensureFamiliesSeeded() {
  const snap = await getDocs(collection(db, 'families'))
  if (!snap.empty) return
  const batch = writeBatch(db)
  DEFAULT_FAMILIES.forEach((f) => {
    batch.set(doc(db, 'families', f.id), {
      name: f.name,
      color: f.color,
      order: f.order,
      createdAt: serverTimestamp(),
    })
  })
  await batch.commit()
}

// Aileleri canlı dinle.
export function subscribeFamilies(cb) {
  const q = query(collection(db, 'families'), orderBy('order', 'asc'))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function renameFamily(familyId, name) {
  await updateDoc(doc(db, 'families', familyId), { name })
}
