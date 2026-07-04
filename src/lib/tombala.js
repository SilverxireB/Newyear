import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

const GAME = () => doc(db, 'tombala', 'current')
const CARDS = () => collection(db, 'tombala', 'current', 'cards')

// ---- Oyun kontrolü ----

export function subscribeGame(cb) {
  return onSnapshot(GAME(), (snap) => cb(snap.exists() ? snap.data() : null))
}

// mode: 'cards' (kartlı klasik) | 'numbers' (sadece numara çekme)
export async function startGame({ mode, hostUid, hostName }) {
  await clearCards()
  await setDoc(GAME(), {
    status: 'playing',
    mode,
    drawn: [],
    lastNumber: null,
    hostUid,
    hostName,
    winners: { cinko: [], tombala: [] },
    startedAt: serverTimestamp(),
  })
}

export async function drawNext(game) {
  if (!game || game.status !== 'playing') return null
  const drawn = game.drawn || []
  if (drawn.length >= 90) return null
  const remaining = []
  for (let n = 1; n <= 90; n++) if (!drawn.includes(n)) remaining.push(n)
  const n = remaining[Math.floor(Math.random() * remaining.length)]
  await updateDoc(GAME(), {
    drawn: [...drawn, n],
    lastNumber: n,
  })
  return n
}

export async function finishGame() {
  await updateDoc(GAME(), { status: 'finished' })
}

export async function resetGame() {
  await clearCards()
  await setDoc(GAME(), {
    status: 'idle',
    mode: null,
    drawn: [],
    lastNumber: null,
    winners: { cinko: [], tombala: [] },
  })
}

async function clearCards() {
  const snap = await getDocs(CARDS())
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

// ---- Kartlar ----

export function subscribeCards(cb) {
  return onSnapshot(CARDS(), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  )
}

// Kullanıcının kartı yoksa üret ve kaydet; varsa mevcut olanı döndür.
export async function ensureCard({ uid, name, familyId }) {
  const ref = doc(db, 'tombala', 'current', 'cards', uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data()
  const cells = generateCardCells()
  const data = { uid, name, familyId: familyId || null, cells, createdAt: serverTimestamp() }
  await setDoc(ref, data)
  return data
}

export async function claimWin(type, { uid, name, familyId }) {
  await updateDoc(GAME(), {
    [`winners.${type}`]: arrayUnion({ uid, name, familyId: familyId || null }),
  })
  if (type === 'tombala') await finishGame()
}

// ---- Kart üretimi (Türk tombalası: 3 satır x 9 sütun, her satırda 5 sayı = 15) ----
// Firestore iç içe dizi tutamadığı için düz 27'lik dizi olarak saklanır (boşluklar null).

function generateCardCells() {
  const columns = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    range(10, 19),
    range(20, 29),
    range(30, 39),
    range(40, 49),
    range(50, 59),
    range(60, 69),
    range(70, 79),
    [80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90],
  ]

  const mask = buildMask() // 3x9 (0/1), her satır 5, her sütun 1-3
  const grid = Array.from({ length: 3 }, () => Array(9).fill(null))

  for (let c = 0; c < 9; c++) {
    const count = mask[0][c] + mask[1][c] + mask[2][c]
    const picks = shuffle(columns[c].slice()).slice(0, count).sort((a, b) => a - b)
    let pi = 0
    for (let r = 0; r < 3; r++) {
      if (mask[r][c]) grid[r][c] = picks[pi++]
    }
  }

  // 3x9 -> düz 27
  return grid.flat()
}

function buildMask() {
  // Her satır toplamı 5, her sütun toplamı 1..3 olan 3x9 ikili matris üret.
  for (let attempt = 0; attempt < 500; attempt++) {
    const counts = Array(9).fill(1) // her sütun en az 1
    let extra = 6 // 9 + 6 = 15
    while (extra > 0) {
      const i = Math.floor(Math.random() * 9)
      if (counts[i] < 3) {
        counts[i]++
        extra--
      }
    }
    const mask = assignRows(counts)
    if (mask) return mask
  }
  // Güvenli varsayılan (nadiren buraya düşer)
  return [
    [1, 1, 1, 1, 1, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 1, 0, 1],
  ]
}

function assignRows(counts) {
  // Her sütun için counts[c] satırı seç; her satır toplamı 5 olacak şekilde. Rastgele + doğrulama.
  for (let attempt = 0; attempt < 300; attempt++) {
    const mask = [Array(9).fill(0), Array(9).fill(0), Array(9).fill(0)]
    for (let c = 0; c < 9; c++) {
      const rows = shuffle([0, 1, 2]).slice(0, counts[c])
      rows.forEach((r) => (mask[r][c] = 1))
    }
    const ok = [0, 1, 2].every((r) => mask[r].reduce((a, b) => a + b, 0) === 5)
    if (ok) return mask
  }
  return null
}

function range(a, b) {
  const out = []
  for (let i = a; i <= b; i++) out.push(i)
  return out
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ---- Tespit (çinko / tombala) ----

// cells: 27 uzunluk düz dizi. drawnSet: Set. Döner: {rows:[bool,bool,bool], marked, total, tombala}
export function analyzeCard(cells, drawnSet) {
  const rows = []
  let marked = 0
  let total = 0
  for (let r = 0; r < 3; r++) {
    let rowNums = 0
    let rowMarked = 0
    for (let c = 0; c < 9; c++) {
      const v = cells[r * 9 + c]
      if (v != null) {
        rowNums++
        total++
        if (drawnSet.has(v)) {
          rowMarked++
          marked++
        }
      }
    }
    rows.push(rowNums > 0 && rowMarked === rowNums)
  }
  const cinkoCount = rows.filter(Boolean).length
  return { rows, marked, total, cinko: cinkoCount >= 1, tombala: marked === total && total > 0 }
}
