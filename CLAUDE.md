# Newyear Traitors — Proje Özeti

4 aile (Baharözü, Çepni, Hoşçoşkun, Özen) + çocuklarla yılbaşında 2-3 gün ev tutup kutlayan grubun sitesi. Tamamen Türkçe, mobil öncelikli. Kullanıcı: Doğan (doganbaharozu@gmail.com), teknik değil — adımları basit anlat, ekran görüntüsüyle yönlendir.

## Teknoloji & Deploy
- React 18 + Vite + Tailwind, Firebase (Auth Google + Firestore), Cloudinary (fotoğraflar)
- Firebase projesi: `newyear-e7616` (config `src/firebase.js`'de gömülü, .env opsiyonel)
- Cloudinary: cloud `dah8lwcea`, unsigned preset `Claude` (`src/cloudinary.js`)
- **Canlı site:** newyeartraitors.vercel.app (Vercel projesi `newyearapp`, GitHub push → otomatik deploy; production branch = `claude/new-year-celebration-site-v1ngkv`)
- Bu branch tek gerçek kaynak; her iş: build → commit → bu branch'e push
- Firestore kuralları `firestore.rules`'da; HER kural değişikliğinde kullanıcıya "Firebase Console → Firestore → Rules'a yapıştır → Publish" hatırlat (otomatik deploy YOK)

## Roller & Aile mantığı
- İlk kayıt olan otomatik `admin` (users/{uid}.role); admin Yönetim'den rol/aile atar
- Aile seçimi kullanıcıya SORULMAZ — admin atar (SelectFamily silindi, geri getirme)
- Masraf/borç ailelere göre: 4 aile eşit böler; tombala kâr/zararı (`tombala/ledger`) masraf dengesine eklenir

## Özellikler (hepsi canlı/Firestore senkron)
- **Masraf:** ekle/sil, "Kim Kime Borçlu" (greedy denkleştirme), tombala sütunu, admin ledger sıfırlama
- **Liste:** Alışveriş (üstlenme yok, "alındı" işaretle, kalan sayacı, "sadece kalanlar" filtresi, toplu yapıştır, 67 maddelik hazır şablon `src/data/shoppingTemplate.js`) + Getirilecekler (havuz → aileye atama, aile dağılım çubukları)
- **Albüm:** Cloudinary orijinal kalite upload, blur→net grid, uzun bas + yatay sürükle çoklu seçim, toplu indir/sil, kaydırmalı viewer (min-h-0 fix), yükleme progress
- **Tombala:** kartlı (bahisli, 6 karttan seçim, kart no, klasik renkli görünüm) + sadece-numara modu; otomatik çekme 3/5/10 sn; çinko/tombala butonları; kazananda oyun OTOMATİK BİTMEZ — host "Bitir & masrafa ekle" der (finalizeGame → ledger); ödül %20/%20/%60, kazanan yoksa havuz iptal (sıfır toplam)
- **Tabu:** gerçek zamanlı çoklu oyuncu (`src/lib/tabu.js`, Firestore `tabu/current`), anlatıcı/denetçi modu, pause, 3 pas sonrası pas=tabu, admin-only başlatma ayarı (`settings`), ~600 kart `src/data/tabuDeck.js` (level 1/2/3) — kullanıcı 1000+ istiyor, parti parti büyüt
- **Vampir Köylü:** admin oyuncu seçer + vampir sayısı (varsayılan 2), roller kişiye özel (`vampir/current/roles/{uid}` sadece sahibi okur); rol temizleme koleksiyon SORGUSU YAPMA (kural reddeder) — oyun dokümanındaki players listesinden uid ile sil
- **Ev Seçimi (`/ev`, `src/pages/Houses.jsx`, `src/lib/houses.js`, koleksiyon `houses`):** WhatsApp'taki ev oylama karmaşasını çözer. Aday ev ekle (link + Cloudinary foto opsiyonel), kişi başı tepki oyu (😍/👍/😐/❌ = love/ok/meh/veto → +2/+1/0/-3). "Asla"=veto rozeti + kim veto verdiği görünür; sıralama seçilen>vetosu az>puan. Admin "🏆 Bunu seç" ile sabitler. Ekleyen ya da admin siler.
- **Müzik Kuyruğu (`/muzik`, `src/pages/Music.jsx`, `src/lib/music.js`, koleksiyonlar `queue`/`music`/`history`):** ortak parti DJ. Herkes YouTube linki ekler (oEmbed ile başlık+kapak, API anahtarı YOK), FIFO kuyruk, now-playing=queue[0]. Tek cihaz "📻 Bu cihazda çal" ile YouTube IFrame'i EKRAN DIŞINDA (görünmez, sadece ses) çalar; oynat/duraklat/atla `music/state` ile senkron. Sıralama istemci `addedAt` (serverTimestamp pending bug'ı için). Atla=geçmişe arşivle (silme YOK), biten=dinlendi say. `history/{videoId}` playCount, `music/stats.byUser` DJ sıralaması. Geçmişten 🔁 tekrar ekle.
- **Görünüm efektleri + tema (Yönetim→"Görünüm & Tema", `src/lib/settings.js` `DEFAULT_SETTINGS`):** admin herkes için seçer/aç-kapatır, `settings/general` ile canlı senkron. Efektler: ❄️ kar (`Snowfall.jsx`, canvas, varsayılan açık) + 🎆 havai fişek (`Fireworks.jsx`, varsayılan kapalı — kullanıcı sevmiyor). Tema (`settings.theme`): `'default'` gece/altın (varsayılan) | `'noel'` yeşil-kırmızı-çam ağaçlı (CSS `html.theme-noel` `index.css`'de, Layout kök sınıfı ekler). NOT: Noel teması artık SEÇİLEBİLİR (zorla değil) — kullanıcı bu haliyle istedi; peri ışıkları geri getirme.
- **Splash:** sinematik açılış (halka+logo+kıvılcım+harf harf başlık). Zorunlu min bekleme (eski `minWait`) KALDIRILDI — splash sadece `loading` sürerken görünür (App.jsx). Geri ekleme.

## Bilinen tuzaklar
- Firestore'da owner-only read olan koleksiyonda `getDocs` çekme → permission hatası
- Kullanıcı bazen başka AI ile de geliştiriyor: işe başlamadan `git fetch` + remote ile senkron ol
- Ekran görüntüleri token yakıyor; kısa ve öz çalış, gereksiz dosya okuma

## Firestore koleksiyonları (rules'da match var)
users, families, expenses, tombala(+cards), listitems, photos, vampir(+roles), wishes/messages/polls, tabu, **houses**, **queue**, **music**, **history**, settings. Efekt ayarları `settings/general`'da (yeni alan = kural değişikliği GEREKMEZ, admin zaten yazıyor).

## Bekleyen fikirler (kullanıcı onaylı sıra yok)
- Tabu destesini 1000+ karta büyütme (zor+kaliteli kelimeler)
- Menü/nöbet çizelgesi, ödeme takibi ("ödendi ✓"), aile vs aile puan tablosu, gece yarısı 00:00 kutlama animasyonu, yıldan yıla arşiv
- Daha önce sunulan ama kullanıcının "bunlar değil" dediği fikirler: gizli hediye çekilişi, zaman kapsülü, quiz — ısrarla önerme
- Google OAuth branding: kullanıcı "Newyear Traitors" adını ve logoyu (public/icon-512.png) Google Cloud Branding'e girdi/giriyor
