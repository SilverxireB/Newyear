import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

const COL = 'listitems'

// type: 'shopping' (market alışverişi) | 'bring' (kim ne getiriyor)
export function subscribeList(cb) {
  const q = query(collection(db, COL), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function addItem({ title, type, uid, name }) {
  const t = title.trim()
  if (!t) return
  await addDoc(collection(db, COL), {
    title: t,
    type,
    done: false,
    doneByName: null,
    addedByUid: uid,
    addedByName: name,
    assignedUid: null,
    assignedName: null,
    createdAt: serverTimestamp(),
  })
}

// Çok satırlı metni tek seferde ekler (Google Keep listesini yapıştır).
export async function bulkAdd({ text, type, uid, name }) {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.\s\[\]xX]+/, '').trim()) // baştaki -, •, 1., [ ] gibi işaretleri temizle
    .filter((l) => l.length > 0)
  if (lines.length === 0) return 0
  const batch = writeBatch(db)
  const now = serverTimestamp()
  lines.forEach((title) => {
    const ref = doc(collection(db, COL))
    batch.set(ref, {
      title,
      type,
      done: false,
      doneByName: null,
      addedByUid: uid,
      addedByName: name,
      assignedUid: null,
      assignedName: null,
      createdAt: now,
    })
  })
  await batch.commit()
  return lines.length
}

export async function toggleDone(item, { name }) {
  await updateDoc(doc(db, COL, item.id), {
    done: !item.done,
    doneByName: !item.done ? name : null,
  })
}

// Üstlen / bırak (aynı kişi tekrar basınca bırakır)
export async function toggleClaim(item, { uid, name }) {
  const mine = item.assignedUid === uid
  await updateDoc(doc(db, COL, item.id), {
    assignedUid: mine ? null : uid,
    assignedName: mine ? null : name,
  })
}

export async function removeItem(id) {
  await deleteDoc(doc(db, COL, id))
}
