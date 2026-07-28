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

## 2) Canlı senkron — kurulu ve çalışıyor

Firebase **kuruldu**, ayrıca bir şey yapmanız gerekmez:

- Proje: `gorusme-sekreterye` — Realtime Database, bölge `europe-west1`
- Ayarlar `firebase-config.js` içinde; adres `...europe-west1.firebasedatabase.app`
  ile biter (bölgesel veritabanları `firebaseio.com` kullanmaz).
- Sağ altta **"canlı bağlı"** yazıyorsa senkron açık. "yerel deneme modu"
  yazıyorsa Firebase'e ulaşılamıyor, veri yalnızca o tarayıcıda kalır.

### Giriş yok — bilinçli tercih

**Sitede kimlik doğrulama YOKTUR ve eklenmeyecektir.** Adresi bilen herkes
açar, listeyi görür ve değiştirebilir. Kurallar (`database.rules.json`):

```json
{ "rules": { "oturum": { ".read": true, ".write": true } } }
```

Sebep: bu araç tek günlük iç kullanım için yapıldı, ömrü bitince Firebase
projesi silinecek. Giriş ekranı, şifre, kullanıcı hesabı, `auth != null`
kuralı **istenmiyor** — bunlar süreci uzatıyor ve karşılığında bir günlük bir
araca değmiyor. Kural değiştirmek gerekirse:

```bash
firebase deploy --only database --project gorusme-sekreterye
```

### Kullanım sonrası

Site bittiğinde Firebase konsolundan projeyi silmek yeterli; veriler onunla
birlikte gider.

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
| `index.html` | Dört ekranın yapısı (giriş / başkan / sekreterya / rapor) |
| `styles.css` | Tüm görünüm — telefon, tablet ve masaüstü uyumlu |
| `app.js` | Tüm mantık: senkron, durum geçişleri, otomatik akış, sürükle-bırak, süre sayacı |
| `firebase-config.js` | **Sadece burayı düzenlemeniz gerekir** — Firebase bilgileri |
| `hazir-liste.js` | Çizelgeden aktarılmış görüşme sırası — "Hazır listeyi yükle" butonu bunu kullanır |
| `rapor.js` | Rapor: maddeleri üretir, düzenlemeyi ve taslağı yönetir |
| `ortak.js` | İki dosyanın paylaştığı küçük yardımcılar (ad, süre, saat biçimleri) |
| `dev-server.mjs` | Bilgisayarda denemek için küçük yerel sunucu (yayında gerekmez) |

### Hazır liste

Sekreterya ekranında, ekleme formunun altındaki **📋 Hazır listeyi yükle** butonu
`hazir-liste.js` içindeki çizelgeyi tek dokunuşla listeye ekler — 28 kişiyi elle
girmek gerekmez. Grup adı (`Toplantı sonrası`, `Çarşamba online`) her kişinin
**Not** alanına yazılır; not alanı düzenlenebilir olduğu için görüşme sırasında
üzerine yazabilirsiniz.

Listede zaten kişi varsa buton önce onay sorar, sonra yenileri **sonuna** ekler.
Çizelge daha önce yüklenmişse (aynı adlar listede varsa) uyarı bunu söyler —
böylece kayıtlar yanlışlıkla ikiye katlanmaz. Yanında duran
**🗑 Listeyi temizle** düğmesi (onay sorarak) bütün kayıtları silip temiz
başlamayı sağlar; olay günlüğü silinmez, temizleme de rapora bir satır olarak
düşer.
Yeni bir çizelge geldiğinde yalnızca `hazir-liste.js` değişir: saatler `"SS:DD"`
biçiminde yazılır, sıralama dosyadaki sıradır.

## Rapor (📄) ve PDF

Giriş ekranındaki **Rapor** kartından veya Başkan ekranının altındaki
**Günün raporunu çıkar** düğmesinden açılır. Sırada kimse kalmayıp en az bir
görüşme bittiğinde bu düğme yeşile döner: *"Görüşmeler bitti — raporu çıkar"*.

Rapor, oturum verisinden ve olay günlüğünden üretilir; şu bölümleri içerir:

- **Özet** — kaç kişi, kaç görüşme, toplam/ortalama süre, toplam bekleme,
  saatinde giren sayısı, ilk giriş ve son bitiş saati.
- **Görüşmeler** — her kişi için: planlanan saat, gerçek giriş saati ve
  **kaç dakika gecikmeli/erken** girdiği, görüşme süresi, başkanın **beklemede
  bıraktığı** süre, bitiş saati ve notu.
- **Görüşülemeyenler** — sıra gelmeyen kişiler, saatleri ve notlarıyla.
- **Değişiklikler ve olaylar** — kim ne zaman ne yaptı: sekreteryanın
  ad/saat/not düzeltmeleri (eski → yeni), eklemeler, silmeler, sıra
  değişiklikleri, başkanın görüşmede/beklemede/bitti geçişleri.

Raporun tarihi **görüşmelerin yapıldığı gündür** (ilk görüşmeye giriş anı);
hiç görüşme yapılmadıysa bugünün tarihi yazılır. Çizelgenin bir gün önce
girilmiş olması tarihi etkilemez.

### Canlı + düzenlenebilir

Rapor **canlıdır**: sekreterya bir adı, saati veya notu düzeltince rapor da
anında düzelir (sayılar, kişi satırları, olay listesi yeniden üretilir).

Buna rağmen elle yaptıklarınız korunur. Her madde tek tek **düzenlenebilir**
(üzerine dokunup yazmak yeterli) ve **🗑 ile silinebilir**; `+ Madde ekle` ile
kendi maddenizi yazabilirsiniz. Elle yazdığınız maddeler **sarı çizgiyle**
işaretlenir ve artık veriyle güncellenmez — yazdığınız gibi kalır.
`🔄 Yeniden oluştur` bütün müdahaleleri geri alır (onay sorar).

Teknik olarak: her otomatik maddenin kararlı bir kimliği vardır
(`gorusme:<kisiId>`, `olay:<gunlukId>` …). Taslakta metinlerin tamamı değil,
yalnızca **kullanıcının müdahalesi** saklanır: çıkarılan kimlikler, elle
yazılmış metinler ve eklenen serbest maddeler. Bu yüzden rapor bayatlamaz.

**Rapordan madde silmek listeden kişi silmez** — rapor kaynak veriye dokunmaz.

### PDF

**📄 PDF olarak indir** tarayıcının yazdırma penceresini açar; hedef olarak
*"PDF olarak kaydet"* seçilir. Yazdırma çıktısında araç çubuğu, üst bar ve
silme düğmeleri görünmez; yalnızca rapor metni basılır.

### Olay günlüğü

Rapordaki "Değişiklikler ve olaylar" bölümü `oturum/gunluk` düğümünden gelir;
her yazma işlemi kendi güncellemesine günlük satırını da ekler (ayrı istek yok).
Günlük bu sürümde eklendiği için **daha önce yapılmış** işlemler raporda
görünmez; bundan sonraki tüm değişiklikler kaydedilir.

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
