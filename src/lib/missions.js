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

// Foto görevleri
export function subscribeMissions(cb) {
  return onSnapshot(collection(db, 'missions'), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  )
}

export async function addMission({ title, uid, name }) {
  await addDoc(collection(db, 'missions'), {
    title: title.trim(),
    byUid: uid,
    byName: name || 'biri',
    addedAt: Date.now(),
    createdAt: serverTimestamp(),
  })
}

export async function removeMission(id) {
  await deleteDoc(doc(db, 'missions', id))
}

// Göreve gönderilen fotoğraflar
export function subscribeSubs(cb) {
  return onSnapshot(collection(db, 'missionSubs'), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  )
}

export async function addSub({ missionId, photoUrl, publicId, uid, name }) {
  await addDoc(collection(db, 'missionSubs'), {
    missionId,
    photoUrl,
    publicId: publicId || '',
    byUid: uid,
    byName: name || 'biri',
    likes: {},
    addedAt: Date.now(),
    createdAt: serverTimestamp(),
  })
}

export async function toggleLike(subId, uid, liked) {
  await updateDoc(doc(db, 'missionSubs', subId), { [`likes.${uid}`]: liked ? deleteField() : true })
}

export async function removeSub(id) {
  await deleteDoc(doc(db, 'missionSubs', id))
}

export const likeCount = (s) => Object.keys(s.likes || {}).length
