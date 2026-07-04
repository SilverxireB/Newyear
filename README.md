# 🎆 Yılbaşı — Ailece Kutlama Sitesi

4 aile, ailece yılbaşı gecesi. Ortak **masraf paylaşımı** (Splitwise mantığı), **canlı tombala** (yakında) ve daha fazlası. Mobil öncelikli, tamamen Türkçe.

## Özellikler

- **Tek tıkla Google girişi** — uğraştırmayan kayıt.
- **Aile mantığı** — herkes ilk girişte 4 aileden birini seçer. Masraflar kişi değil **aile** bazında tutulur.
- **Masraf paylaşımı** — masraf 4 aileye **eşit** bölünür, kim kime ne kadar borçlu otomatik hesaplanır.
- **Canlı tombala** — iki mod:
  - **Kartlı Tombala:** başlatınca herkese otomatik tombala kartı gelir, çekilen numaralar herkeste anında işaretlenir, çinko/tombala bildirimi.
  - **Sadece Numara Çekme:** kart yok; elindeki fiziki kartla oynarsın, site canlı numara çeker.
- **Canlı senkron** — Firestore ile herkeste anında güncellenir.
- **Rol yapısı** — siteye **ilk kayıt olan yönetici (admin)** olur; yönetim sayfaları sadece ona görünür. Yönetici, gerekirse başkalarına da "Yönetim" sayfasından yönetici rolü verebilir.
- **Yönetim paneli** — aile adlarını değiştir, kişilerin ailesini düzelt, rol ata.

## Teknoloji

React + Vite + Tailwind CSS + Firebase (Authentication + Firestore).

## Kurulum

### 1. Firebase projesi oluştur
1. [console.firebase.google.com](https://console.firebase.google.com) → yeni proje.
2. **Authentication → Sign-in method → Google**'ı etkinleştir.
3. **Firestore Database** oluştur.
4. **Proje Ayarları → Uygulamalarım → Web (`</>`)** ekle, çıkan config değerlerini kopyala.

### 2. Ortam değişkenleri
```bash
cp .env.example .env
```
`.env` içine Firebase config değerlerini ve yönetici e-postalarını yaz.

### 3. Çalıştır
```bash
npm install
npm run dev
```

### 4. Güvenlik kuralları
`firestore.rules` dosyasındaki kuralları Firebase Console → Firestore → Rules bölümüne yapıştır (ya da Firebase CLI ile `firebase deploy --only firestore:rules`). Yönetici e-postalarını hem `.env` (`VITE_ADMIN_EMAILS`) hem `firestore.rules` içinde güncel tut.

## Yayına alma (opsiyonel)

```bash
npm run build
# Firebase Hosting ile:
npx firebase-tools deploy
```
`dist/` klasörü herhangi bir statik hosting'e (Firebase Hosting, Vercel, Netlify) de yüklenebilir.

## Veri modeli (Firestore)

- `users/{uid}` — `{ name, email, photoURL, familyId }`
- `families/{id}` — `{ name, color, order }` (varsayılan 4 aile ilk açılışta oluşur)
- `expenses/{id}` — `{ title, amount, familyId, paidByUid, paidByName, category, createdAt }`

## Notlar

- Firebase web config değerleri tarayıcıda görünür, **gizli değildir** — güvenlik Firestore kurallarıyla sağlanır.
- Masraf bölüşümü şu an **4 aile eşit**. İleride kişi başı / özel bölüşüm eklenebilir.
