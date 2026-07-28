# Görüşme — Başkan ⇄ Sekreterya Köprüsü

Başkan ile sekreterya arasında **canlı** çalışan basit bir site.
Sekreterya sırayı yönetir, başkan görüşme durumunu değiştirir; iki taraf da
birbirinin değişikliğini **anında** görür.

## Nasıl çalışır?

| Ekran | Ne yapar |
|---|---|
| **Giriş** | İki buton: **Başkan** / **Sekreterya** |
| **Başkan** | 🟢 Görüşmede · 🟡 Beklemede · 🔴 Bitti · "Sıradaki kişi gelebilir" · süre sayacı · 📋 listeye bak |
| **Sekreterya** | Üç sürükle-bırak kutusu (Görüşmede / Bitti görüşme / Sıradaki) + Ad-Soyad-Saat-Not tablosu (ekle / düzenle / sil) |

**Otomatik akış:** Başkan 🔴 **Bitti**'ye basınca o kişi kendiliğinden "Bitti"
kutusuna düşer ve "Sıradaki kişi gelebilir" butonu aktifleşir. Butona basınca
sıradaki kişi otomatik "Görüşmede" kutusuna geçer, süre sayacı sıfırdan başlar.
Sekreterya her zaman sürükleyip elle düzeltebilir.

**Süre sayacı:** Görüşmede olan kişinin süresi sayar; 🟡 Beklemede ve 🔴 Bitti'de durur.

---

## 1) Hemen denemek (kurulumsuz)

Bu klasörde küçük bir yerel sunucu başlatın (dosyayı çift tıklamak yetmez,
tarayıcı modül dosyalarını doğrudan açmıyor):

```bash
cd "/Users/enesyasingedik/Desktop/proje/Sekreterya/Görüşme" && node dev-server.mjs
```

Sonra tarayıcıda `http://localhost:8000` açın. İki sekme açıp birini Başkan,
birini Sekreterya yapın — **aynı bilgisayardaki sekmeler** senkron çalışır.

> Sağ üstte **"yerel deneme modu"** yazıyorsa Firebase henüz ayarlanmamıştır:
> farklı cihazlar birbirini görmez. Aşağıdaki adımı yapın.

---

## 2) Ayrı cihazlarda canlı senkron (Firebase — ücretsiz, 5 dakika)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → bir ad verin (Google Analytics'e gerek yok, kapatabilirsiniz).
2. Sol menüden **Build → Realtime Database** → **Create Database** → bölge seçin → **Start in test mode** → Enable.
3. Sol üstteki ⚙️ **Project settings** → aşağıda **Your apps** → web simgesi **`</>`** → uygulamaya bir ad verin → **Register app**.
4. Ekranda çıkan `firebaseConfig = { ... }` bloğunu kopyalayın.
5. Bu klasördeki **`firebase-config.js`** dosyasını açın, içindeki değerleri kopyaladığınız gerçek değerlerle **değiştirin**.
   `databaseURL` satırının **mutlaka bulunması** gerekir (Realtime Database adresi, `...firebaseio.com` ile biter). Firebase bunu bazen config bloğunda göstermez — o zaman Realtime Database sayfasının üstündeki adresi yazın.
6. Sayfayı yenileyin. Sağ üstte **"canlı bağlı"** yazmalı. Artık ayrı cihazlar senkron.

### Güvenlik kuralları (önemli)

Test modu **30 gün sonra kapanır** ve o süre boyunca adresi bilen herkes veriyi
okuyup yazabilir. İç kullanım için Realtime Database → **Rules** sekmesine
en azından şunu yazın ve `SIZIN_GIZLI_SOZUNUZ` yerine kimseye söylemediğiniz
bir kelime koyun (bu kural, veriyi yalnızca bu siteyi bilenlerin kullanmasını
sağlamaz; gerçek koruma için 3. adımı okuyun):

```json
{
  "rules": {
    "oturum": {
      ".read": true,
      ".write": true
    }
  }
}
```

Bu, "adresi bilen yazabilir" demektir — küçük bir iç araç için genelde kabul
edilir, ama site adresi dışarı sızarsa herkes müdahale edebilir. Gerçek koruma
isterseniz Firebase **Authentication** (e-posta/şifre) ekleyip kuralı
`".read": "auth != null"` şeklinde değiştirmek gerekir; isterseniz bunu sonradan
ekleyebiliriz.

---

## 3) İnternete koymak (isteğe bağlı)

Site tamamen statiktir; şu yollardan biriyle yayınlanabilir:

- **Firebase Hosting** — `npm i -g firebase-tools`, sonra `firebase login`, `firebase init hosting` (public klasör olarak bu klasörü seçin), `firebase deploy`
- **Netlify / Vercel** — klasörü sürükleyip bırakmak yeterli
- **GitHub Pages** — dosyaları bir repoya koyup Pages'i açmak

Yayınladıktan sonra başkan ve sekreterya aynı adresi açar; herkes kendi rolünü seçer.
Adresi doğrudan role gitmesi için kaydedebilirler:
`.../#/baskan` ve `.../#/sekreterya`

---

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Üç ekranın yapısı (giriş / başkan / sekreterya) |
| `styles.css` | Tüm görünüm — telefon, tablet ve masaüstü uyumlu |
| `app.js` | Tüm mantık: senkron, durum geçişleri, otomatik akış, sürükle-bırak, süre sayacı |
| `firebase-config.js` | **Sadece burayı düzenlemeniz gerekir** — Firebase bilgileri |
| `dev-server.mjs` | Bilgisayarda denemek için küçük yerel sunucu (yayında gerekmez) |

## Küçük ayrıntılar

- **Telefon ve küçük tablette (≤820px)** tablo yatay kaymaz; her kişi bir kart olarak alt alta görünür.
  Daha geniş ekranlarda (≥821px) klasik tablo görünümü kullanılır; sütun genişlikleri sabittir,
  böylece uzun ad/soyad "Not" sütununu ezmez.
- Sürükleme sırasında ekranın üst/alt kenarına yaklaşınca sayfa **kendiliğinden kayar**.
- Sekreterya bir nota yazarken karşı taraftan güncelleme gelirse **yazdığı metin ve imleç korunur**.
- Kutulardaki kişi kartındaki **↩** düğmesi kişiyi listeye geri alır.
- Adresi doğrudan role açmak için: `#/baskan` veya `#/sekreterya`.

### Bildirim (🔔 "Sıradaki kişi gelebilir")

Başkan bir görüşmeyi bitirip "Sıradaki kişi gelebilir" aktifleşince, **sekreterya**
ekranını açık tutan cihaza tarayıcı bildirimi + titreşim + kısa bir bip sesi gider.
Sınırları:

- Sayfanın o cihazda **açık** olması gerekir (sekme arka planda olabilir, ama
  tamamen kapatılmış olamaz). Bu, gerçek bir sunucu **push**'u değildir.
- İlk kullanımda tarayıcı izin ister; reddedilirse (veya işletim sistemi
  bildirimleri kapalıysa) yalnızca titreşim/ses çalışır, bildirim gelmez.
- **iOS Safari**'de bildirim desteği kısıtlıdır (genelde yalnızca siteyi ana
  ekrana eklenmiş PWA olarak açtıysanız çalışır); Android ve masaüstünde sorun yoktur.
- Hangi cihazın "sekreterya" sayıldığı o cihazın kendi tarayıcı hafızasında
  tutulur. **Aynı bilgisayarda** iki sekmede hem Başkan hem Sekreterya açarsanız,
  en son hangi sekmeye geçtiyseniz cihaz onu "sekreterya" sanır — normal
  kullanımda (ayrı cihazlar) bu bir sorun yaratmaz.
