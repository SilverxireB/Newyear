import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

const SETTINGS = () => doc(db, 'settings', 'general')

export function subscribeSettings(cb) {
  return onSnapshot(SETTINGS(), (snap) => {
    if (snap.exists()) {
      cb(snap.data())
    } else {
      // Varsayılan ayarlar
      cb({ tabuAdminOnly: false })
    }
  })
}

export async function setTabuAdminOnly(val) {
  try {
    await updateDoc(SETTINGS(), { tabuAdminOnly: val })
  } catch (err) {
    // Eğer belge yoksa oluştur
    if (err.code === 'not-found') {
      await setDoc(SETTINGS(), { tabuAdminOnly: val })
    } else {
      throw err
    }
  }
}
