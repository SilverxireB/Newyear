import { deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Eğlenceli ödül kategorileri.
export const AWARD_CATEGORIES = [
  { id: 'komik', emoji: '😂', title: 'En Komik' },
  { id: 'tembel', emoji: '😴', title: 'En Tembel' },
  { id: 'obur', emoji: '🍖', title: 'En Çok Yiyen' },
  { id: 'kral', emoji: '👑', title: 'Gecenin Kralı/Kraliçesi' },
  { id: 'hain', emoji: '😈', title: 'En Büyük Hain' },
  { id: 'yardim', emoji: '😇', title: 'En Yardımsever' },
  { id: 'dj', emoji: '🎧', title: 'En İyi DJ' },
  { id: 'geveze', emoji: '🗣️', title: 'En Geveze' },
]

const REF = () => doc(db, 'awards', 'board')

export function subscribeAwards(cb) {
  return onSnapshot(REF(), (snap) => cb(snap.exists() ? snap.data() : {}))
}

export async function castVote(categoryId, voterUid, targetUid) {
  try {
    await updateDoc(REF(), { [`${categoryId}.${voterUid}`]: targetUid })
  } catch (e) {
    if (e.code === 'not-found') {
      await setDoc(REF(), { [categoryId]: { [voterUid]: targetUid } }, { merge: true })
    } else {
      throw e
    }
  }
}

export async function clearVote(categoryId, voterUid) {
  await updateDoc(REF(), { [`${categoryId}.${voterUid}`]: deleteField() })
}

// Kategori oylarını say → [{uid, count}] büyükten küçüğe.
export function tallyCategory(data, categoryId) {
  const votes = (data && data[categoryId]) || {}
  const counts = {}
  for (const target of Object.values(votes)) {
    if (target) counts[target] = (counts[target] || 0) + 1
  }
  return Object.entries(counts)
    .map(([uid, count]) => ({ uid, count }))
    .sort((a, b) => b.count - a.count)
}
