import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribePhotos(cb) {
  const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function addPhoto({ publicId, url, width, height, uid, name, familyId }) {
  await addDoc(collection(db, 'photos'), {
    publicId,
    url,
    width: width || null,
    height: height || null,
    uploaderUid: uid,
    uploaderName: name,
    familyId: familyId || null,
    createdAt: serverTimestamp(),
  })
}

export async function deletePhoto(id) {
  await deleteDoc(doc(db, 'photos', id))
}
