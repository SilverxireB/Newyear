import { Link } from 'react-router-dom'

const GAMES = [
  { to: '/tombala', icon: '🎱', title: 'Tombala', sub: 'Canlı çekiliş, kartlı & bahisli' },
  { to: '/tabu', icon: '🃏', title: 'Tabu', sub: 'Anlat, tahmin ettir — takım takım' },
  { to: '/vampir', icon: '🧛', title: 'Vampir Köylü', sub: 'Gizli rol dağıtımı' },
]

export default function Oyunlar() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">🎮 Oyunlar</h1>
        <p className="text-slate-400 text-sm">Gece boyu oynayacaklarınız burada.</p>
      </div>
      <div className="space-y-3">
        {GAMES.map((g) => (
          <Link
            key={g.to}
            to={g.to}
            className="card p-4 flex items-center gap-4 active:scale-[0.99] transition"
          >
            <span className="text-3xl">{g.icon}</span>
            <span className="flex-1">
              <span className="block font-display font-bold text-slate-100">{g.title}</span>
              <span className="block text-xs text-slate-400">{g.sub}</span>
            </span>
            <span className="text-slate-500 text-xl">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
