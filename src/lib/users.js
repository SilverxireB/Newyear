import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Kullanıcının ailesini ayarla (ilk giriş seçimi veya yönetici düzeltmesi).
export async function setUserFamily(uid, familyId) {
  await updateDoc(doc(db, 'users', uid), { familyId })
}

// Kullanıcının rolünü ayarla (yalnızca yönetici yapabilir). role: 'admin' | 'member'
export async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role })
}

// Tüm kullanıcıları canlı dinle (aile üyelerini göstermek / yönetici paneli için).
export function subscribeUsers(cb) {
  return onSnapshot(collection(db, 'users'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}
