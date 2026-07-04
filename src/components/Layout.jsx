import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Fireworks from './Fireworks.jsx'

const navItems = [
  { to: '/', label: 'Ana Sayfa', icon: '🏠', end: true },
  { to: '/masraf', label: 'Masraf', icon: '💸' },
  { to: '/liste', label: 'Liste', icon: '🛒' },
  { to: '/oyunlar', label: 'Oyunlar', icon: '🎮' },
]

export default function Layout({ children }) {
  const { profile, signOut, admin } = useAuth()

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Fireworks />

      <header className="pt-safe sticky top-0 z-20 bg-night-950/70 backdrop-blur border-b border-white/10">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold">
            <img src="/icon-192.png" alt="" className="w-7 h-7 rounded-lg" />
            <span className="gold-text text-lg">Newyear Traitors</span>
          </div>
          <div className="flex items-center gap-3">
            {admin && (
              <NavLink
                to="/yonetim"
                className={({ isActive }) =>
                  `text-lg ${isActive ? 'text-gold-400' : 'text-slate-400 hover:text-slate-100'}`
                }
                aria-label="Yönetim"
              >
                ⚙️
              </NavLink>
            )}
            <span className="hidden sm:block text-sm text-slate-300 max-w-[10rem] truncate">
              {profile?.name}
            </span>
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt=""
                className="w-8 h-8 rounded-full border border-white/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/10 grid place-items-center text-xs">
                {profile?.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <button onClick={signOut} className="text-slate-400 hover:text-slate-100 text-sm">
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-5 pb-28">{children}</main>

      <nav className="pb-safe fixed bottom-0 inset-x-0 z-20 bg-night-900/80 backdrop-blur border-t border-white/10">
        <div className="mx-auto max-w-2xl px-2 grid grid-cols-4">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function NavItem({ to, label, icon, end, className = '' }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
          isActive ? 'text-gold-400' : 'text-slate-400'
        } ${className}`
      }
    >
      <span className="text-xl leading-none">{icon}</span>
      {label}
    </NavLink>
  )
}
