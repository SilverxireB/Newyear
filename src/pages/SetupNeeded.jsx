export default function SetupNeeded() {
  const steps = [
    'console.firebase.google.com adresinden yeni bir proje oluştur.',
    'Sol menüden Authentication > Sign-in method > Google\'ı etkinleştir.',
    'Firestore Database oluştur (production modda başlayabilirsin).',
    'Proje Ayarları > "Web uygulaması" ekle, çıkan config değerlerini kopyala.',
    'Projedeki ".env.example" dosyasını ".env" olarak kopyalayıp değerleri yapıştır.',
    '"npm run dev" ile tekrar başlat.',
  ]
  return (
    <div className="min-h-[100dvh] grid place-items-center px-4">
      <div className="card max-w-lg w-full p-6 animate-fade-up">
        <div className="text-4xl mb-3">🎆</div>
        <h1 className="font-display text-2xl font-bold gold-text">Kuruluma az kaldı</h1>
        <p className="mt-2 text-slate-300 text-sm">
          Site canlı giriş ve ortak veri için Firebase kullanıyor. Ayarlar henüz girilmemiş.
        </p>
        <ol className="mt-4 space-y-2.5">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-200">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gold-500/20 text-gold-300 grid place-items-center font-semibold">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-500">
          Firebase config değerleri tarayıcıda görünür, gizli değildir — güvenlik Firestore
          kurallarıyla sağlanır.
        </p>
      </div>
    </div>
  )
}
