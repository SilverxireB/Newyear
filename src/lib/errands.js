import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

// Mutfaktan Getir: canlı istek panosu. Tek koleksiyon; status ile açık/geçmiş ayrılır.
export function subscribeErrands(cb, onError) {
  return onSnapshot(
    collection(db, 'errands'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err),
  )
}

export async function addErrand({ item, uid, name }) {
  await addDoc(collection(db, 'errands'), {
    item: item.trim(),
    byUid: uid,
    byName: name || 'biri',
    alsoWant: {},
    status: 'open',
    addedAt: Date.now(),
    createdAt: serverTimestamp(),
  })
}

// "Bana da" — isteğe katıl/ayrıl (uid'e göre).
export async function toggleAlsoWant(id, uid, name, isIn) {
  await updateDoc(doc(db, 'errands', id), {
    [`alsoWant.${uid}`]: isIn ? deleteField() : name || 'biri',
  })
}

// "Ben getirdim" — isteği geçmişe taşı, getirene puan (kaç kişiye getirdiyse).
export async function bringErrand(id, uid, name) {
  await updateDoc(doc(db, 'errands', id), {
    status: 'done',
    broughtByUid: uid,
    broughtByName: name || 'biri',
    doneAt: Date.now(),
  })
}

export async function removeErrand(id) {
  await deleteDoc(doc(db, 'errands', id))
}

// Getirilen bir kaydın kaç kişiye hizmet ettiği = isteyen (1) + bana da diyenler.
export function servedCount(e) {
  return 1 + Object.keys(e.alsoWant || {}).length
}

// İyilik puanı sıralaması: geçmiş kayıtlardan getirene göre topla.
export function kindnessBoard(errands) {
  const by = {}
  for (const e of errands) {
    if (e.status !== 'done' || !e.broughtByUid) continue
    const k = e.broughtByUid
    if (!by[k]) by[k] = { uid: k, name: e.broughtByName || 'biri', points: 0, trips: 0 }
    by[k].points += servedCount(e)
    by[k].trips += 1
  }
  return Object.values(by).sort((a, b) => b.points - a.points)
}
