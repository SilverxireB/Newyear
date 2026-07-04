import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  addItem,
  bulkAdd,
  removeItem,
  subscribeList,
  toggleClaim,
  toggleDone,
} from '../lib/list.js'
import { SHOPPING_TEMPLATE } from '../data/shoppingTemplate.js'

const TABS = [
  { id: 'shopping', label: '🛒 Alışveriş', claim: 'alırım', doneWord: 'alındı' },
  { id: 'bring', label: '🎁 Kim Ne Getiriyor', claim: 'getiririm', doneWord: 'hazır' },
]

export default function Liste() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('shopping')

  useEffect(() => subscribeList(setItems), [])

  const meta = TABS.find((t) => t.id === tab)
  const list = useMemo(
    () => items.filter((i) => i.type === tab),
    [items, tab],
  )
  const doneCount = list.filter((i) => i.done).length

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-gold-500/20 text-gold-200 border border-gold-400/40'
                : 'bg-white/5 text-slate-300 border border-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AddBar tab={tab} user={user} profile={profile} />

      {list.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all"
              style={{ width: `${(doneCount / list.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 tabular-nums">
            {doneCount}/{list.length}
          </span>
        </div>
      )}

      {list.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <div className="text-4xl mb-2">{tab === 'shopping' ? '🛒' : '🎁'}</div>
          Liste boş. Yukarıdan madde ekle ya da "Toplu ekle" ile listeni yapıştır.
          {tab === 'shopping' && (
            <div className="mt-4">
              <button
                onClick={() =>
                  bulkAdd({
                    text: SHOPPING_TEMPLATE.join('\n'),
                    type: 'shopping',
                    uid: user.uid,
                    name: profile.name,
                  })
                }
                className="btn-gold"
              >
                🧾 Hazır alışveriş listesini yükle ({SHOPPING_TEMPLATE.length} madde)
              </button>
            </div>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((item) => (
            <ListRow key={item.id} item={item} meta={meta} user={user} profile={profile} />
          ))}
        </ul>
      )}
    </div>
  )
}

function AddBar({ tab, user, profile }) {
  const [title, setTitle] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(0)

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await addItem({ title, type: tab, uid: user.uid, name: profile.name })
    setTitle('')
  }

  const doBulk = async () => {
    if (!bulkText.trim()) return
    setBusy(true)
    try {
      const n = await bulkAdd({ text: bulkText, type: tab, uid: user.uid, name: profile.name })
      setAdded(n)
      setBulkText('')
      setTimeout(() => {
        setAdded(0)
        setBulkOpen(false)
      }, 1500)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={submit} className="flex gap-2">
        <input
          className="input"
          placeholder="Yeni madde ekle…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="btn-gold px-4">
          Ekle
        </button>
      </form>

      <button
        onClick={() => setBulkOpen((v) => !v)}
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        {bulkOpen ? '× Toplu eklemeyi kapat' : '📋 Toplu ekle (listeyi yapıştır)'}
      </button>

      {bulkOpen && (
        <div className="card p-3 space-y-2 animate-fade-up">
          <p className="text-xs text-slate-400">
            Her satıra bir madde yaz (ya da Google Keep listeni olduğu gibi yapıştır). Baştaki
            "-", "•", "1." gibi işaretler otomatik temizlenir.
          </p>
          <textarea
            className="input min-h-[120px] resize-y"
            placeholder={'Domates\nMeze\nİçecek\nÇerez…'}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <button onClick={doBulk} disabled={busy} className="btn-gold w-full">
            {busy ? 'Ekleniyor…' : added ? `✓ ${added} madde eklendi` : 'Hepsini ekle'}
          </button>
        </div>
      )}
    </div>
  )
}

function ListRow({ item, meta, user, profile }) {
  const mine = item.assignedUid === user.uid
  return (
    <li className={`card p-3 flex items-center gap-3 ${item.done ? 'opacity-60' : ''}`}>
      <button
        onClick={() => toggleDone(item, { name: profile.name })}
        className={`shrink-0 w-7 h-7 rounded-lg border grid place-items-center transition ${
          item.done
            ? 'bg-emerald-500 border-emerald-500 text-night-950'
            : 'border-white/20 text-transparent'
        }`}
        aria-label={meta.doneWord}
      >
        ✓
      </button>

      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${item.done ? 'line-through' : ''}`}>
          {item.title}
        </div>
        <div className="text-xs text-slate-400 truncate">
          {item.done && item.doneByName
            ? `${meta.doneWord} · ${item.doneByName}`
            : item.assignedName
              ? `${item.assignedName} ${meta.claim}`
              : 'üstlenen yok'}
        </div>
      </div>

      <button
        onClick={() => toggleClaim(item, { uid: user.uid, name: profile.name })}
        className={`shrink-0 text-xs px-2.5 py-1.5 rounded-lg border transition ${
          mine
            ? 'border-gold-400/50 bg-gold-500/15 text-gold-200'
            : 'border-white/10 text-slate-300'
        }`}
      >
        {mine ? '✓ ben' : `ben ${meta.claim}`}
      </button>

      <button
        onClick={() => removeItem(item.id)}
        className="shrink-0 text-slate-500 hover:text-rose-400 text-lg leading-none px-1"
        aria-label="sil"
      >
        ×
      </button>
    </li>
  )
}
