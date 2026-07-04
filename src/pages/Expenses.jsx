import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { subscribeFamilies } from '../lib/families.js'
import {
  addExpense,
  computeSettlement,
  deleteExpense,
  formatTL,
  subscribeExpenses,
} from '../lib/expenses.js'
import { subscribeLedger, sumLedger } from '../lib/tombala.js'

const CATEGORIES = [
  { id: 'yemek', label: 'Yemek', icon: '🍽️' },
  { id: 'icecek', label: 'İçecek', icon: '🥤' },
  { id: 'ikram', label: 'İkram', icon: '🍫' },
  { id: 'susleme', label: 'Süsleme', icon: '🎉' },
  { id: 'tombala', label: 'Tombala', icon: '🎁' },
  { id: 'genel', label: 'Diğer', icon: '🧾' },
]

export default function Expenses() {
  const { user, profile, admin } = useAuth()
  const [families, setFamilies] = useState([])
  const [expenses, setExpenses] = useState([])
  const [ledger, setLedger] = useState([])
  const [tab, setTab] = useState('liste') // 'liste' | 'hesap'

  useEffect(() => {
    const u1 = subscribeFamilies(setFamilies)
    const u2 = subscribeExpenses(setExpenses)
    const u3 = subscribeLedger(setLedger)
    return () => {
      u1()
      u2()
      u3()
    }
  }, [])

  const familyById = useMemo(
    () => Object.fromEntries(families.map((f) => [f.id, f])),
    [families],
  )
  const tombalaNet = useMemo(() => sumLedger(ledger), [ledger])
  const hasTombala = ledger.length > 0
  const settlement = useMemo(
    () => computeSettlement(families, expenses, tombalaNet),
    [families, expenses, tombalaNet],
  )

  return (
    <div className="space-y-5">
      <AddExpenseForm user={user} profile={profile} />

      <div className="flex gap-2">
        <TabBtn active={tab === 'liste'} onClick={() => setTab('liste')}>
          Masraflar
        </TabBtn>
        <TabBtn active={tab === 'hesap'} onClick={() => setTab('hesap')}>
          Kim Kime Borçlu
        </TabBtn>
      </div>

      {tab === 'liste' ? (
        <ExpenseList
          expenses={expenses}
          familyById={familyById}
          canDelete={(e) => admin || e.paidByUid === user.uid}
        />
      ) : (
        <Settlement settlement={settlement} familyById={familyById} hasTombala={hasTombala} />
      )}
    </div>
  )
}

function AddExpenseForm({ user, profile }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('yemek')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const amt = parseFloat(String(amount).replace(',', '.'))
    if (!title.trim() || !amt || amt <= 0) return
    setBusy(true)
    try {
      await addExpense({
        title,
        amount: amt,
        familyId: profile.familyId,
        paidByUid: user.uid,
        paidByName: profile.name,
        category,
      })
      setTitle('')
      setAmount('')
      setCategory('yemek')
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-gold w-full py-3.5 text-base">
        ➕ Masraf Ekle
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3 animate-fade-up">
      <div>
        <label className="label">Ne alındı?</label>
        <input
          className="input"
          placeholder="Örn: Hindi, meze, içecek…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="label">Tutar (₺)</label>
        <input
          className="input"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Kategori</label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-xl border px-2 py-2 text-sm transition ${
                category === c.id
                  ? 'border-gold-400/70 bg-gold-500/15 text-gold-200'
                  : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Bu masraf <b>{profile?.name}</b> adına, ailenin kasasına yazılacak.
      </p>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">
          Vazgeç
        </button>
        <button type="submit" disabled={busy} className="btn-gold flex-1">
          {busy ? 'Ekleniyor…' : 'Ekle'}
        </button>
      </div>
    </form>
  )
}

function ExpenseList({ expenses, familyById, canDelete }) {
  if (expenses.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-400">
        <div className="text-4xl mb-2">🧾</div>
        Henüz masraf yok. İlk masrafı sen ekle!
      </div>
    )
  }
  return (
    <ul className="space-y-2.5">
      {expenses.map((e) => {
        const fam = familyById[e.familyId]
        const cat = CATEGORIES.find((c) => c.id === e.category)
        return (
          <li key={e.id} className="card p-3.5 flex items-center gap-3">
            <span className="text-2xl">{cat?.icon || '🧾'}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{e.title}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                {fam && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: fam.color }}
                  />
                )}
                {e.paidByName} · {fam?.name || 'Aile'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold tabular-nums">{formatTL(e.amount)}</div>
              {canDelete(e) && (
                <button
                  onClick={() => deleteExpense(e.id)}
                  className="text-xs text-slate-500 hover:text-rose-400"
                >
                  sil
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Settlement({ settlement, familyById, hasTombala }) {
  const { total, share, transfers, perFamily } = settlement
  return (
    <div className="space-y-4">
      <div className="card p-4 grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-xs text-slate-400">Toplam masraf</div>
          <div className="font-display text-xl font-bold gold-text">{formatTL(total)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Aile başı pay</div>
          <div className="font-display text-xl font-bold">{formatTL(share)}</div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-display font-bold mb-3">Ödemeler</h3>
        {transfers.length === 0 ? (
          <p className="text-slate-400 text-sm">Herkes denk 👌 Ödeme gerekmiyor.</p>
        ) : (
          <ul className="space-y-2.5">
            {transfers.map((t, i) => {
              const from = familyById[t.from]
              const to = familyById[t.to]
              return (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-xl bg-night-900/60 border border-white/10 p-3"
                >
                  <Dot color={from?.color} />
                  <span className="text-sm font-medium">{from?.name}</span>
                  <span className="text-gold-400">→</span>
                  <Dot color={to?.color} />
                  <span className="text-sm font-medium flex-1">{to?.name}</span>
                  <span className="font-semibold tabular-nums text-emerald-400">
                    {formatTL(t.amount)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="card p-4">
        <h3 className="font-display font-bold mb-3">Aile bazında</h3>
        {hasTombala && (
          <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[10px] uppercase tracking-wide text-slate-500">
            <span>Aile</span>
            <span className="text-right">Masraf</span>
            <span className="text-right w-20">Tombala</span>
            <span className="text-right w-20">Toplam</span>
          </div>
        )}
        <ul className="space-y-2">
          {Object.entries(perFamily).map(([id, v]) => {
            const fam = familyById[id]
            return (
              <li
                key={id}
                className={`items-center text-sm ${
                  hasTombala
                    ? 'grid grid-cols-[1fr_auto_auto_auto] gap-x-3'
                    : 'flex gap-2'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Dot color={fam?.color} />
                  <span className="truncate">{fam?.name}</span>
                </span>
                {hasTombala ? (
                  <>
                    <Signed v={v.expenseBalance} className="text-right tabular-nums w-16" />
                    <Signed v={v.tombalaNet} className="text-right tabular-nums w-20" tombala />
                    <Signed v={v.balance} className="text-right tabular-nums w-20 font-semibold" />
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-slate-400 tabular-nums text-right">
                      ödedi {formatTL(v.paid)}
                    </span>
                    <Signed v={v.balance} className="w-24 text-right tabular-nums font-medium" />
                  </>
                )}
              </li>
            )
          })}
        </ul>
        {hasTombala && (
          <p className="mt-3 text-xs text-slate-500">
            "Tombala" sütunu oyunlardan gelen kazanç/kayıptır ve toplam borç/alacağa dahildir. 🎱
          </p>
        )}
      </div>
    </div>
  )
}

function Signed({ v, className = '', tombala }) {
  const color = v > 0.01 ? 'text-emerald-400' : v < -0.01 ? 'text-rose-400' : 'text-slate-400'
  const txt =
    Math.abs(v) < 0.01 ? (tombala ? '—' : 'denk') : `${v > 0 ? '+' : ''}${formatTL(v)}`
  return <span className={`${color} ${className}`}>{txt}</span>
}

function Dot({ color }) {
  return <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color || '#666' }} />
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active ? 'bg-gold-500/20 text-gold-200 border border-gold-400/40' : 'bg-white/5 text-slate-300 border border-white/10'
      }`}
    >
      {children}
    </button>
  )
}
