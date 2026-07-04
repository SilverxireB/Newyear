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

export async function addExpense({ title, amount, familyId, paidByUid, paidByName, category }) {
  await addDoc(collection(db, 'expenses'), {
    title: title.trim(),
    amount: Number(amount),
    familyId, // masrafı yapan aile
    paidByUid,
    paidByName,
    category: category || 'genel',
    createdAt: serverTimestamp(),
  })
}

export async function deleteExpense(id) {
  await deleteDoc(doc(db, 'expenses', id))
}

export function subscribeExpenses(cb) {
  const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

/**
 * Masrafları 4 aile arasında EŞİT bölerek hesap çıkarır; varsa tombala netini de katar.
 * families: [{id, name, color}]
 * expenses: [{amount, familyId}]
 * tombalaNet: { familyId -> net } (kazanç +, kayıp -). Havuz sıfır toplamlı olduğu için denge korunur.
 * Döner: { total, share, perFamily: {id -> {paid, expenseBalance, tombalaNet, balance}}, transfers }
 */
export function computeSettlement(families, expenses, tombalaNet = {}) {
  const n = families.length || 1
  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const share = total / n

  const paid = {}
  families.forEach((f) => (paid[f.id] = 0))
  expenses.forEach((e) => {
    if (e.familyId && paid[e.familyId] !== undefined) {
      paid[e.familyId] += Number(e.amount) || 0
    }
  })

  const perFamily = {}
  const creditors = [] // fazla ödeyen (alacaklı)
  const debtors = [] // az ödeyen (borçlu)
  families.forEach((f) => {
    const expenseBalance = round2((paid[f.id] || 0) - share)
    const tNet = round2(Number(tombalaNet[f.id]) || 0)
    const balance = round2(expenseBalance + tNet)
    perFamily[f.id] = { paid: round2(paid[f.id] || 0), expenseBalance, tombalaNet: tNet, balance }
    if (balance > 0.01) creditors.push({ id: f.id, amount: balance })
    else if (balance < -0.01) debtors.push({ id: f.id, amount: -balance })
  })

  // Basit greedy denkleştirme: en az sayıda transferle borçları kapat.
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)
  const transfers = []
  let ci = 0
  let di = 0
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci]
    const d = debtors[di]
    const amount = round2(Math.min(c.amount, d.amount))
    if (amount > 0.01) {
      transfers.push({ from: d.id, to: c.id, amount })
    }
    c.amount = round2(c.amount - amount)
    d.amount = round2(d.amount - amount)
    if (c.amount <= 0.01) ci++
    if (d.amount <= 0.01) di++
  }

  return { total: round2(total), share: round2(share), perFamily, transfers }
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function formatTL(n) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)
}
