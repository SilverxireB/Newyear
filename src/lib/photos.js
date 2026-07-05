import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribePhotos(cb) {
  const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function addPhoto({ id, publicId, url, width, height, uid, name, familyId }) {
  const data = {
    publicId,
    url,
    width: width || null,
    height: height || null,
    uploaderUid: uid,
    uploaderName: name,
    familyId: familyId || null,
    createdAt: serverTimestamp(),
  }
  // Bilinen id -> yükleme önizlemesini gerçek foto ile pürüzsüz eşleştirmek için.
  if (id) await setDoc(doc(db, 'photos', id), data)
  else await addDoc(collection(db, 'photos'), data)
}

export async function deletePhoto(id) {
  await deleteDoc(doc(db, 'photos', id))
}
