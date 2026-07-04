import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { subscribeFamilies } from '../lib/families.js'
import {
  addItem,
  assignFamily,
  bulkAdd,
  removeItem,
  subscribeList,
  toggleClaim,
  toggleDone,
} from '../lib/list.js'
import { SHOPPING_TEMPLATE } from '../data/shoppingTemplate.js'

const TABS = [
  { id: 'shopping', label: '🛒 Alışveriş' },
  { id: 'bring', label: '🎁 Getirilecekler' },
]

export default function Liste() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [families, setFamilies] = useState([])
  const [tab, setTab] = useState('shopping')

  useEffect(() => {
    const u1 = subscribeList(setItems)
    const u2 = subscribeFamilies(setFamilies)
    return () => {
      u1()
      u2()
    }
  }, [])

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

      {tab === 'shopping' ? (
        <ShoppingView items={items} user={user} profile={profile} />
      ) : (
        <BringView items={items} families={families} user={user} profile={profile} />
      )}
    </div>
  )
}

/* ---------------- ALIŞVERİŞ ---------------- */

function ShoppingView({ items, user, profile }) {
  const list = useMemo(() => items.filter((i) => i.type === 'shopping'), [items])
  const doneCount = list.filter((i) => i.done).length

  return (
    <div className="space-y-4">
      <AddBar type="shopping" user={user} profile={profile} />

      {list.length > 0 && <Progress done={doneCount} total={list.length} />}

      {list.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <div className="text-4xl mb-2">🛒</div>
          Liste boş. Yukarıdan madde ekle, "Toplu ekle" ile yapıştır ya da hazır listeyi yükle.
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
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((item) => (
            <ShoppingRow key={item.id} item={item} user={user} profile={profile} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ShoppingRow({ item, user, profile }) {
  const mine = item.assignedUid === user.uid
  return (
    <li className={`card p-3 flex items-center gap-3 ${item.done ? 'opacity-60' : ''}`}>
      <CheckButton done={item.done} onClick={() => toggleDone(item, { name: profile.name })} />
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${item.done ? 'line-through' : ''}`}>
          {item.title}
        </div>
        <div className="text-xs text-slate-400 truncate">
          {item.done && item.doneByName
            ? `alındı · ${item.doneByName}`
            : item.assignedName
              ? `${item.assignedName} alıyor`
              : 'kim alacak?'}
        </div>
      </div>
      <button
        onClick={() => toggleClaim(item, { uid: user.uid, name: profile.name })}
        className={`shrink-0 text-xs px-2.5 py-1.5 rounded-lg border transition ${
          mine ? 'border-gold-400/50 bg-gold-500/15 text-gold-200' : 'border-white/10 text-slate-300'
        }`}
      >
        {mine ? '✓ ben' : 'ben alırım'}
      </button>
      <DeleteX onClick={() => removeItem(item.id)} />
    </li>
  )
}

/* ---------------- GETİRİLECEKLER (aile havuzu) ---------------- */

function BringView({ items, families, user, profile }) {
  const bring = useMemo(() => items.filter((i) => i.type === 'bring'), [items])
  const pool = bring.filter((i) => !i.assignedFamilyId)
  const famItems = (fid) => bring.filter((i) => i.assignedFamilyId === fid)

  return (
    <div className="space-y-4">
      <AddBar type="bring" user={user} profile={profile} />

      {bring.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <div className="text-4xl mb-2">🎁</div>
          Henüz getirilecek bir şey yok. Yukarıdan ekle — sonra aileler havuzdan üstlenir.
        </div>
      ) : (
        <>
          {/* Aile dağılım grafiği */}
          <div className="card p-4">
            <h3 className="font-display font-bold mb-3">Aile dağılımı</h3>
            <div className="space-y-2.5">
              {families.map((f) => {
                const its = famItems(f.id)
                const done = its.filter((i) => i.done).length
                const pct = its.length ? (done / its.length) * 100 : 0
                const isMine = f.id === profile.familyId
                return (
                  <div key={f.id} className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: f.color }} />
                    <span className={`text-sm w-28 truncate ${isMine ? 'font-semibold' : ''}`}>
                      {f.name}
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: f.color }} />
                    </div>
                    <span className="text-xs text-slate-400 tabular-nums w-12 text-right">
                      {done}/{its.length}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Havuz */}
          <section>
            <h3 className="font-display font-bold mb-2 flex items-center gap-2">
              🫙 Havuz
              <span className="text-xs font-normal text-slate-400">
                ({pool.length} üstlenilmemiş)
              </span>
            </h3>
            {pool.length === 0 ? (
              <div className="card p-4 text-center text-sm text-slate-400">
                Havuz boş — her şey ailelere dağıtıldı 👌
              </div>
            ) : (
              <ul className="space-y-2">
                {pool.map((item) => (
                  <BringRow
                    key={item.id}
                    item={item}
                    families={families}
                    profile={profile}
                    inPool
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Aile başı listeler */}
          {families.map((f) => {
            const its = famItems(f.id)
            if (its.length === 0) return null
            const isMine = f.id === profile.familyId
            return (
              <section key={f.id}>
                <h3 className="font-display font-bold mb-2 flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ background: f.color }} />
                  {f.name}
                  {isMine && (
                    <span className="text-[10px] bg-gold-500/20 text-gold-300 px-1.5 py-0.5 rounded-full">
                      ailen
                    </span>
                  )}
                </h3>
                <ul className="space-y-2">
                  {its.map((item) => (
                    <BringRow key={item.id} item={item} families={families} profile={profile} />
                  ))}
                </ul>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}

function BringRow({ item, families, profile, inPool }) {
  const myFamilyId = profile.familyId
  return (
    <li className={`card p-3 flex items-center gap-3 ${item.done ? 'opacity-70' : ''}`}>
      {!inPool && (
        <CheckButton done={item.done} onClick={() => toggleDone(item, { name: profile.name })} />
      )}
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${item.done ? 'line-through' : ''}`}>
          {item.title}
        </div>
        <div className="text-xs text-slate-400 truncate">
          {item.done ? `getirildi · ${item.doneByName || ''}` : inPool ? 'kim üstlenecek?' : 'getirilecek'}
        </div>
      </div>

      {inPool && myFamilyId && (
        <button
          onClick={() => assignFamily(item, myFamilyId)}
          className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-gold-400/50 bg-gold-500/15 text-gold-200"
        >
          ailemize al
        </button>
      )}

      {/* aile seçici — havuza da taşıyabilir */}
      <select
        value={item.assignedFamilyId || ''}
        onChange={(e) => assignFamily(item, e.target.value || null)}
        className="shrink-0 rounded-lg bg-night-900/80 border border-white/10 text-xs px-1.5 py-1.5 text-slate-200 max-w-[7rem]"
      >
        <option value="">Havuz</option>
        {families.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>

      <DeleteX onClick={() => removeItem(item.id)} />
    </li>
  )
}

/* ---------------- ortak parçalar ---------------- */

function AddBar({ type, user, profile }) {
  const [title, setTitle] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(0)

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await addItem({ title, type, uid: user.uid, name: profile.name })
    setTitle('')
  }

  const doBulk = async () => {
    if (!bulkText.trim()) return
    setBusy(true)
    try {
      const n = await bulkAdd({ text: bulkText, type, uid: user.uid, name: profile.name })
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
          placeholder={type === 'bring' ? 'Getirilecek bir şey ekle…' : 'Yeni madde ekle…'}
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
            Her satıra bir madde yaz (ya da listeni olduğu gibi yapıştır). Baştaki "-", "•", "[ ]"
            gibi işaretler otomatik temizlenir.
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

function Progress({ done, total }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 tabular-nums">
        {done}/{total}
      </span>
    </div>
  )
}

function CheckButton({ done, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 w-7 h-7 rounded-lg border grid place-items-center transition ${
        done ? 'bg-emerald-500 border-emerald-500 text-night-950' : 'border-white/20 text-transparent'
      }`}
      aria-label="tamam"
    >
      ✓
    </button>
  )
}

function DeleteX({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 text-slate-500 hover:text-rose-400 text-lg leading-none px-1"
      aria-label="sil"
    >
      ×
    </button>
  )
}
