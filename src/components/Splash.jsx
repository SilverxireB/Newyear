export default function Splash() {
  return (
    <div className="min-h-[100dvh] grid place-items-center">
      <div className="text-center animate-pop">
        <img src="/icon-192.png" alt="" className="w-20 h-20 mx-auto mb-4 rounded-2xl" />
        <div className="gold-text font-display text-2xl font-bold">Yılbaşı</div>
        <div className="mt-3 text-slate-400 text-sm">yükleniyor…</div>
      </div>
    </div>
  )
}
