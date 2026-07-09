import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

const SETTINGS = () => doc(db, 'settings', 'general')

// Varsayılan ayarlar. Görünüm efektleri herkeste geçerli olur, admin aç/kapatır.
export const DEFAULT_SETTINGS = {
  tabuAdminOnly: false,
  fxSnow: true, // ❄️ kar yağışı
  fxFireworks: false, // 🎆 havai fişek
  theme: 'default', // 'default' (gece) | 'noel' (yeşil-kırmızı-çam)
}

export function subscribeSettings(cb) {
  return onSnapshot(SETTINGS(), (snap) => {
    cb({ ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) })
  })
}

// Tek bir ayarı günceller; belge yoksa oluşturur.
export async function setSetting(key, value) {
  try {
    await updateDoc(SETTINGS(), { [key]: value })
  } catch (err) {
    if (err.code === 'not-found') {
      await setDoc(SETTINGS(), { [key]: value }, { merge: true })
    } else {
      throw err
    }
  }
}

// Geriye dönük uyumluluk (Tabu ayarı).
export async function setTabuAdminOnly(val) {
  return setSetting('tabuAdminOnly', val)
}
