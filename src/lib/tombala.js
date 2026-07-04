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
// bet: kart başı giriş bahsi (kartlı modda)
export async function startGame({ mode, hostUid, hostName, bet = 0 }) {
  await clearCards()
  await setDoc(GAME(), {
    status: 'playing',
    mode,
    bet: Number(bet) || 0,
    drawn: [],
    lastNumber: null,
    hostUid,
    hostName,
    winners: { cinko: [], tombala: [] },
    result: null,
    gameId: Date.now(),
    startedAt: serverTimestamp(),
  })
}

// Ödül ağırlıkları: 1. çinko ve 2. çinko az, tombala çok (havuzun tamamı dağılır).
export const PRIZE_WEIGHTS = { cinko1: 1, cinko2: 1, tombala: 3 }

// Kart sayısı, kazananlar ve bahisten aile başı kâr/zarar hesabı çıkarır.
export function computePrizes({ cards, winners, bet, families }) {
  const pot = cards.length * (Number(bet) || 0)
  const cinko = winners?.cinko || []
  const tombala = winners?.tombala || []

  const awarded = []
  if (cinko[0]) awarded.push({ type: '1. çinko', ...cinko[0], weight: PRIZE_WEIGHTS.cinko1 })
  if (cinko[1]) awarded.push({ type: '2. çinko', ...cinko[1], weight: PRIZE_WEIGHTS.cinko2 })
  if (tombala[0]) awarded.push({ type: 'tombala', ...tombala[0], weight: PRIZE_WEIGHTS.tombala })

  const perFamily = {}
  ;(families || []).forEach((f) => (perFamily[f.id] = 0))

  // Kazanan yoksa oyun geçersiz: kimseden para çıkmaz (havuz iptal). Böylece hesap hep denk kalır.
  if (awarded.length === 0) {
    return { pot: 0, awarded: [], perFamily }
  }

  const totalW = awarded.reduce((s, a) => s + a.weight, 0)
  awarded.forEach((a) => (a.amount = round2((pot * a.weight) / totalW)))

  // aile başı net = kazanılan ödül - ödenen kart bedeli (toplamı her zaman 0 = denk)
  cards.forEach((c) => {
    if (c.familyId != null) perFamily[c.familyId] = (perFamily[c.familyId] || 0) - (Number(bet) || 0)
  })
  awarded.forEach((a) => {
    if (a.familyId != null) perFamily[a.familyId] = (perFamily[a.familyId] || 0) + a.amount
  })

  return { pot: round2(pot), awarded, perFamily }
}

// Oyunu bitir: aile başı kâr/zararı hesapla, defterine ekle (masraf tablosuna yansısın), oyunu 'finished' yap.
export async function finalizeGame({ game, cards, families }) {
  if (!game || game.status !== 'playing') return
  const result = computePrizes({ cards, winners: game.winners, bet: game.bet || 0, families })

  // Deftere ekle (aynı oyun iki kez eklenmesin)
  const ledgerRef = doc(db, 'tombala', 'ledger')
  const snap = await getDoc(ledgerRef)
  const games = snap.exists() ? snap.data().games || [] : []
  if (!games.some((g) => g.gameId === game.gameId)) {
    games.push({
      gameId: game.gameId || Date.now(),
      bet: game.bet || 0,
      pot: result.pot,
      perFamily: result.perFamily,
      awarded: result.awarded.map((a) => ({ type: a.type, name: a.name, familyId: a.familyId, amount: a.amount })),
      at: Date.now(),
    })
    await setDoc(ledgerRef, { games }, { merge: true })
  }

  await updateDoc(GAME(), { status: 'finished', result })
}

export function subscribeLedger(cb) {
  return onSnapshot(doc(db, 'tombala', 'ledger'), (snap) => {
    cb(snap.exists() ? snap.data().games || [] : [])
  })
}

// Tombala kayıtlarını (kâr/zarar defteri) sıfırla — masraf tablosundan tombala etkisini kaldırır.
export async function clearLedger() {
  await setDoc(doc(db, 'tombala', 'ledger'), { games: [] })
}

// Defterdeki tüm oyunların aile başı netini topla -> { familyId: net }
export function sumLedger(games) {
  const out = {}
  ;(games || []).forEach((g) => {
    Object.entries(g.perFamily || {}).forEach(([fid, v]) => {
      out[fid] = round2((out[fid] || 0) + (Number(v) || 0))
    })
  })
  return out
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

// Yeni bir kart üret (henüz kaydetmez) — kart seçimi için aday üretmekte kullanılır.
export function makeCard() {
  return generateCardCells()
}

// Klasik tombala kartı renkleri (kutudan çıkan renkli kartlar gibi).
export const CARD_COLORS = ['#d84a4a', '#2f7ed8', '#2aa06b', '#e0a11a', '#8b5cf6', '#e05fa0']

// Kişinin seçtiği kartı kaydet.
export async function setMyCard({ uid, name, familyId, cells, color, cardNo }) {
  const ref = doc(db, 'tombala', 'current', 'cards', uid)
  await setDoc(ref, {
    uid,
    name,
    familyId: familyId || null,
    cells,
    color: color || CARD_COLORS[0],
    cardNo: cardNo || Math.floor(1 + Math.random() * 999),
    createdAt: serverTimestamp(),
  })
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
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
