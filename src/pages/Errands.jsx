import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  addErrand,
  bringErrand,
  kindnessBoard,
  removeErrand,
  requestBoard,
  servedCount,
  subscribeErrands,
  toggleAlsoWant,
} from '../lib/errands.js'

const QUICK = ['su', 'çay', 'kahve', 'buz', 'peçete', 'çatal', 'tabak', 'kola']

// İlk harfi büyük (Türkçe: i→İ).
const capTr = (s = '') => (s ? s.charAt(0).toLocaleUpperCase('tr') + s.slice(1) : s)

// İsimleri düzgün biçime çevir: "DOĞAN BAHARÖZÜ" → "Doğan Baharözü".
const niceName = (s = '') =>
  s
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1).toLocaleLowerCase('tr'))
    .join(' ')

// İsteğe göre sade ikon (bulamazsa 🛎️).
const ICONS = [
  [['su'], '💧'],
  [['çay'], '🍵'],
  [['kahve', 'nescafe'], '☕'],
  [['buz'], '🧊'],
  [['peçete', 'havlu', 'mendil'], '🧻'],
  [['çatal'], '🍴'],
  [['kaşık'], '🥄'],
  [['bıçak'], '🔪'],
  [['tabak'], '🍽️'],
  [['kola', 'gazoz', 'soda', 'meşrubat', 'fanta', 'sprite'], '🥤'],
  [['ayran', 'süt', 'yoğurt'], '🥛'],
  [['bardak'], '🥛'],
  [['ekmek'], '🍞'],
  [['tuz'], '🧂'],
  [['biber'], '🌶️'],
  [['şeker'], '🍬'],
  [['limon'], '🍋'],
  [['meyve', 'elma'], '🍎'],
  [['cips'], '🍟'],
  [['çerez', 'kuruyemiş', 'fıstık', 'fındık', 'leblebi'], '🥜'],
  [['meze', 'zeytin'], '🫒'],
  [['sigara'], '🚬'],
  [['çakmak'], '🔥'],
  [['çöp'], '🗑️'],
  [['şarap'], '🍷'],
  [['bira'], '🍺'],
  [['rakı', 'viski', 'votka'], '🥃'],
  [['kadeh', 'şampanya'], '🥂'],
]

const itemIcon = (item = '') => {
  const s = item.toLocaleLowerCase('tr')
  for (const [keys, ic] of ICONS) if (keys.some((k) => s.includes(k))) return ic
  return '🛎️'
}

export default function Errands() {
  const { profile, user, admin } = useAuth()
  const uid = user?.uid
  const [errands, setErrands] = useState([])
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    const u = subscribeErrands(setErrands, (e) => setErr(e?.code || e?.message || 'okuma hatası'))
    return () => u()
  }, [])

  const open = useMemo(
    () => errands.filter((e) => e.status !== 'done').sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0)),
    [errands],
  )
  const done = useMemo(
    () => errands.filter((e) => e.status === 'done').sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)),
    [errands],
  )
  const board = useMemo(() => kindnessBoard(errands), [errands])
  const askers = useMemo(() => requestBoard(errands), [errands])

  const ask = async (text) => {
    const item = (text ?? input).trim()
    if (!item) return
    try {
      await addErrand({ item, uid, name: profile?.name })
      setInput('')
    } catch (e) {
      if (e?.code === 'permission-denied') {
        alert('İzin hatası: Firestore kuralları henüz yayınlanmamış (errands). Console → Rules → Publish.')
      } else {
        alert(`Eklenemedi: ${e?.code || e?.message || 'hata'}`)
      }
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">🙋 Mutfaktan Getir</h1>
        <p className="text-slate-400 text-sm">Bir şey iste; kalkan getirsin, iyilik puanı kapsın.</p>
      </div>

      {err && (
        <div className="card p-3 text-xs text-rose-300 bg-rose-500/10 border-rose-500/30">
          Okunamadı: {err}. Kurallarda “errands” izni olduğundan emin ol.
        </div>
      )}

      {/* İstek ekleme */}
      <div className="card p-3 space-y-3">
        <div className="flex gap-2">
          <input
            className="input py-2.5 flex-1"
            placeholder="Ne getirilsin? (su, çay…)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
          />
          <button onClick={() => ask()} className="btn-gold px-4 text-sm shrink-0">
            İste
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 text-slate-200 active:scale-95"
            >
              {itemIcon(q)} {q}
            </button>
          ))}
        </div>
      </div>

      {/* Açık istekler */}
      <section className="space-y-2">
        <h2 className="font-display font-bold text-sm text-slate-300 px-1">Açık istekler ({open.length})</h2>
        {open.length === 0 && <p className="text-slate-500 text-sm px-1">Şu an isteyen yok 🎉</p>}
        {open.map((e) => {
          const also = Object.entries(e.alsoWant || {})
          const iWant = !!(e.alsoWant && uid in e.alsoWant)
          const mine = e.byUid === uid
          const total = servedCount(e)
          return (
            <div key={e.id} className="card p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-2xl leading-none">{itemIcon(e.item)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold leading-tight">{capTr(e.item)}</div>
                  <div className="text-xs text-slate-400">
                    İsteyen: {niceName(e.byName)}
                    {also.length > 0 && ` · +${also.length} kişi (${also.map(([, n]) => niceName(n)).join(', ')})`}
                  </div>
                </div>
                {(mine || admin) && (
                  <button
                    onClick={() => removeErrand(e.id)}
                    className="text-slate-500 hover:text-rose-400 text-sm px-1 shrink-0"
                    aria-label="İptal"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!mine && (
                  <button
                    onClick={() => toggleAlsoWant(e.id, uid, profile?.name, iWant)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                      iWant
                        ? 'bg-gold-500/20 text-gold-200 border-gold-400/40'
                        : 'bg-white/5 text-slate-300 border-white/10'
                    }`}
                  >
                    {iWant ? '✓ Bana da (vazgeç)' : '🙋 Bana da'}
                  </button>
                )}
                <button
                  onClick={() => bringErrand(e.id, uid, profile?.name)}
                  className="flex-1 btn-gold py-2 text-xs"
                >
                  ✅ Ben getirdim{total > 1 ? ` (${total} kişiye)` : ''}
                </button>
              </div>
            </div>
          )
        })}
      </section>

      {/* İyilik puanı sıralaması */}
      <section className="card p-4">
        <h2 className="font-display font-bold mb-1">🏅 İyilik Puanı</h2>
        <p className="text-xs text-slate-500 mb-3">En çok koşturan (getiren)</p>
        {board.length > 0 ? (
          <ul className="space-y-2">
            {board.slice(0, 8).map((r, i) => (
              <li key={r.uid} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-center">{['🥇', '🥈', '🥉'][i] || i + 1}</span>
                <span className="flex-1 truncate">{niceName(r.name)}</span>
                <span className="text-gold-300 font-semibold">{r.points}</span>
                <span className="text-[11px] text-slate-500">({r.trips} sefer)</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 text-sm">
            Henüz kimse bir şey getirmedi. İlk getiren buraya yazılır 😇
          </p>
        )}
      </section>

      {/* En çok isteyen */}
      {askers.length > 0 && (
        <section className="card p-4">
          <h2 className="font-display font-bold mb-1">🛎️ En Çok İsteyen</h2>
          <p className="text-xs text-slate-500 mb-3">En çok hizmet ettiren 😄</p>
          <ul className="space-y-2">
            {askers.slice(0, 8).map((r, i) => (
              <li key={r.uid} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-center">{['👑', '🥈', '🥉'][i] || i + 1}</span>
                <span className="flex-1 truncate">{niceName(r.name)}</span>
                <span className="text-slate-300 font-semibold">{r.count} istek</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Geçmiş */}
      {done.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display font-bold text-sm text-slate-300 px-1">Getirildi ({done.length})</h2>
          {done.slice(0, 25).map((e) => (
            <div key={e.id} className="card p-2.5 flex items-center gap-3">
              <span className="text-lg">✅</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{capTr(e.item)}</div>
                <div className="text-xs text-slate-400 truncate">
                  {niceName(e.broughtByName)} getirdi{servedCount(e) > 1 ? ` · ${servedCount(e)} kişiye` : ''}
                </div>
              </div>
              {admin && (
                <button
                  onClick={() => removeErrand(e.id)}
                  className="text-slate-500 hover:text-rose-400 text-sm px-1 shrink-0"
                  aria-label="Sil"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
