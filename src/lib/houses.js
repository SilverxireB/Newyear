import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

const COL = () => collection(db, 'houses')

// Tepki puanları. 'veto' (Asla) hem puanı düşürür hem ayrı bir uyarı rozeti olur.
export const VOTE_VALUES = { love: 2, ok: 1, meh: 0, veto: -3 }

export function subscribeHouses(cb) {
  const q = query(COL(), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function addHouse({ title, url, price, location, note, photoUrl, uid, name }) {
  await addDoc(COL(), {
    title: title?.trim() || 'İsimsiz ev',
    url: url?.trim() || '',
    price: price?.trim() || '',
    location: location?.trim() || '',
    note: note?.trim() || '',
    photoUrl: photoUrl || '',
    addedByUid: uid,
    addedByName: name || '',
    votes: {},
    chosen: false,
    createdAt: serverTimestamp(),
  })
}

// Oy ver. Aynı tepkiye tekrar basınca geri çeker (toggle mantığı sayfada).
export async function setVote(houseId, uid, value) {
  await updateDoc(doc(db, 'houses', houseId), { [`votes.${uid}`]: value })
}

export async function clearVote(houseId, uid) {
  await updateDoc(doc(db, 'houses', houseId), { [`votes.${uid}`]: deleteField() })
}

export async function setChosen(houseId, chosen) {
  await updateDoc(doc(db, 'houses', houseId), { chosen })
}

export async function deleteHouse(id) {
  await deleteDoc(doc(db, 'houses', id))
}

// Bir evin puanını, veto verenlerini ve toplam oy sayısını hesaplar.
export function tally(house) {
  const votes = house.votes || {}
  const counts = { love: 0, ok: 0, meh: 0, veto: 0 }
  const vetoes = []
  let score = 0
  for (const [uid, v] of Object.entries(votes)) {
    if (v == null || !(v in VOTE_VALUES)) continue
    counts[v] += 1
    score += VOTE_VALUES[v]
    if (v === 'veto') vetoes.push(uid)
  }
  const total = counts.love + counts.ok + counts.meh + counts.veto
  return { score, vetoes, counts, total }
}

// Sıralama: seçilen en üstte → vetosu az olan → puanı yüksek olan.
export function sortHouses(houses) {
  return [...houses].sort((a, b) => {
    if (!!b.chosen !== !!a.chosen) return a.chosen ? -1 : 1
    const ta = tally(a)
    const tb = tally(b)
    if (ta.vetoes.length !== tb.vetoes.length) return ta.vetoes.length - tb.vetoes.length
    return tb.score - ta.score
  })
}
