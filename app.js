// ============================================================
//  Görüşme — Başkan & Sekreterya köprüsü
//  Saf JavaScript. Derleme adımı yok.
//
//  Veri, Firebase Realtime Database'te tek bir "oturum" düğümünde
//  tutulur; iki taraf da aynı düğümü dinler → anında senkron.
//  Firebase ayarlanmamışsa yerel deneme moduna düşer.
// ============================================================

import { firebaseConfig } from "./firebase-config.js";

/* ============================================================
   1) VERİ KATMANI
   Aynı arayüzü sunan iki arka uç: Firebase ve yerel deneme.
   - abone(cb)        : oturum verisi her değiştiğinde cb(veri)
   - guncelle(yollar) : { "kisiler/k1/kutu": "bitti", "durum": "bitti" }
   ============================================================ */

const FIREBASE_AYARLI = !String(firebaseConfig.apiKey || "").startsWith("BURAYA");

const BOS_OTURUM = {
  durum: "bos",          // gorusmede | beklemede | bitti | bos
  siradakiHazir: false,
  aktifKisiId: null,
  kisiler: {},
};

let depo = null;   // { abone, guncelle }

async function firebaseDepoKur() {
  const { initializeApp } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
  );
  const { getDatabase, ref, onValue, update } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"
  );

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const oturumRef = ref(db, "oturum");
  const baglantiRef = ref(db, ".info/connected");

  onValue(baglantiRef, (snap) => {
    baglantiGoster(snap.val() ? "bagli" : "kopuk");
  });

  return {
    abone(cb) {
      onValue(oturumRef, (snap) => cb({ ...BOS_OTURUM, ...(snap.val() || {}) }));
    },
    async guncelle(yollar) {
      await update(oturumRef, yollar);
    },
  };
}

function yerelDepoKur() {
  // Aynı tarayıcıdaki sekmeler arasında senkron (deneme amaçlı).
  const ANAHTAR = "gorusme_oturum_v1";
  const kanal = "BroadcastChannel" in window ? new BroadcastChannel(ANAHTAR) : null;
  const dinleyiciler = [];

  const oku = () => {
    try {
      return { ...BOS_OTURUM, ...(JSON.parse(localStorage.getItem(ANAHTAR)) || {}) };
    } catch {
      return { ...BOS_OTURUM };
    }
  };
  const yayinla = () => {
    const veri = oku();
    dinleyiciler.forEach((cb) => cb(veri));
  };

  kanal?.addEventListener("message", yayinla);
  window.addEventListener("storage", (e) => { if (e.key === ANAHTAR) yayinla(); });

  baglantiGoster("yerel");

  return {
    abone(cb) { dinleyiciler.push(cb); cb(oku()); },
    async guncelle(yollar) {
      const veri = oku();
      for (const [yol, deger] of Object.entries(yollar)) {
        const parcalar = yol.split("/");
        const son = parcalar.pop();
        let hedef = veri;
        for (const p of parcalar) {
          if (typeof hedef[p] !== "object" || hedef[p] === null) hedef[p] = {};
          hedef = hedef[p];
        }
        if (deger === null) delete hedef[son];
        else hedef[son] = deger;
      }
      localStorage.setItem(ANAHTAR, JSON.stringify(veri));
      yayinla();
      kanal?.postMessage("degisti");
    },
  };
}

function baglantiGoster(tip) {
  const el = document.getElementById("baglantiDurumu");
  const metinler = {
    bagli:  "canlı bağlı",
    kopuk:  "bağlantı yok",
    yerel:  "yerel deneme modu",
    bekle:  "bağlanıyor…",
  };
  el.className = "baglanti " + (tip === "bekle" ? "" : tip);
  el.querySelector(".metin").textContent = metinler[tip] || tip;
  el.title = tip === "yerel"
    ? "Firebase ayarlanmadı: farklı cihazlar birbirini görmez. README.md'ye bakın."
    : "Sunucu bağlantısı";
}

/* ============================================================
   2) DURUM
   ============================================================ */

let oturum = { ...BOS_OTURUM };
let suruklenenId = null;

const KUTU_ADI = { gorusmede: "Görüşmede", siradaki: "Sıradaki" };

const $ = (sec) => document.querySelector(sec);
const el = (id) => document.getElementById(id);

/* Kişileri sıra numarasına göre dizi olarak ver */
function kisiListesi(kutu = null) {
  return Object.entries(oturum.kisiler || {})
    .map(([id, k]) => ({ id, ...k }))
    .filter((k) => (kutu ? (k.kutu || "liste") === kutu : true))
    .sort((a, b) => (a.sira || 0) - (b.sira || 0));
}

function tamAd(k) {
  if (!k) return "—";
  return [k.ad, k.soyad].filter(Boolean).join(" ") || "(isimsiz)";
}

function sonrakiSira() {
  const hepsi = kisiListesi();
  return hepsi.length ? Math.max(...hepsi.map((k) => k.sira || 0)) + 1 : 1;
}

/* Sırada bekleyen ilk kişi: önce "Sıradaki" kutusu, sonra liste */
function siradakiKisi() {
  return kisiListesi("siradaki")[0] || kisiListesi("liste")[0] || null;
}

/* Sitenin her yerinde aynı öncelik: görüşmede en üstte, bekleyenler ortada.
   Bitti olanlar bu listelere hiç girmez — kendi ayrı, katlanır bölümünde. */
const KUTU_ONCELIK = { gorusmede: 0, siradaki: 1, liste: 2 };

/* Aktif + bekleyen kişiler (bitti hariç), öncelik sırasıyla */
function kisiListesiAktif() {
  return kisiListesi()
    .filter((k) => (k.kutu || "liste") !== "bitti")
    .sort((a, b) => KUTU_ONCELIK[a.kutu || "liste"] - KUTU_ONCELIK[b.kutu || "liste"]);
}

/* Bitti kutusundaki kişiler — ayrı, katlanır bölümde gösterilir */
function kisiListesiBitti() {
  return kisiListesi("bitti");
}

/* ============================================================
   3) SÜRE SAYACI
   Kişide birikenMs (durmuş süre) + gorusmeBaslangic (çalışıyorsa).
   Başkan ekranında 10 dakikalık geri sayım gösterilir; görüşme bitince
   gerçekte ne kadar sürdüğü (birikenMs) Biten görüşmeler'de isminin
   yanında yazar.
   ============================================================ */

const HEDEF_SURE_SN = 10 * 60; // görüşme için hedeflenen süre: 10 dakika

function gecenMs(k) {
  if (!k) return 0;
  const biriken = k.birikenMs || 0;
  return k.gorusmeBaslangic ? biriken + (Date.now() - k.gorusmeBaslangic) : biriken;
}

/* Aynı mantık, "beklemede" geçen süre için (başkan notlarını alırken) */
function gecenBeklemeMs(k) {
  if (!k) return 0;
  const biriken = k.birikenBeklemeMs || 0;
  return k.beklemeBaslangic ? biriken + (Date.now() - k.beklemeBaslangic) : biriken;
}

/* Geçen süreyi mm:ss (uzunsa sa:dk:sn) biçiminde yazar — Biten görüşmeler'de kullanılır */
function sureBicimle(ms) {
  const sn = Math.max(0, Math.floor(ms / 1000));
  const dk = Math.floor(sn / 60);
  const kalan = sn % 60;
  if (dk >= 60) {
    const sa = Math.floor(dk / 60);
    return `${sa}:${String(dk % 60).padStart(2, "0")}:${String(kalan).padStart(2, "0")}`;
  }
  return `${String(dk).padStart(2, "0")}:${String(kalan).padStart(2, "0")}`;
}

/* 10 dakikadan geriye sayar; süre dolunca eksiye geçip "ek süre"yi gösterir */
function geriSayimBicimle(ms) {
  const kalanSn = HEDEF_SURE_SN - Math.floor(ms / 1000);
  const tukendi = kalanSn < 0;
  const mutlakSn = Math.abs(kalanSn);
  const dk = Math.floor(mutlakSn / 60);
  const sn = mutlakSn % 60;
  const metin = `${String(dk).padStart(2, "0")}:${String(sn).padStart(2, "0")}`;
  return { metin: tukendi ? "-" + metin : metin, tukendi };
}

/* Süre dolduğunda bildirimi yalnızca bir kez göndermek için: hangi kişi için
   zaten gönderildiğini tutar; aktif kişi değişince sıfırlanır. */
let sureBildirimSonKisiId = null;
let sureBildirimGonderildi = false;

/* Başkan ekranındaki geri sayımı günceller (hem veri değişince hem her saniye) */
function aktifSureGoster() {
  const sureEl = el("aktifSure");
  if (!sureEl) return;

  const aktifId = oturum.aktifKisiId;
  if (aktifId !== sureBildirimSonKisiId) {
    sureBildirimSonKisiId = aktifId;
    sureBildirimGonderildi = false;
  }

  const aktif = oturum.kisiler?.[aktifId];
  const { metin, tukendi } = geriSayimBicimle(gecenMs(aktif));
  sureEl.textContent = metin;
  sureEl.classList.toggle("tukendi", !!aktif && tukendi);
  el("aktifSureEtiket").textContent = aktif && tukendi ? "süre doldu, ek süre" : "kalan süre";

  if (aktif && tukendi && !sureBildirimGonderildi) {
    sureBildirimGonderildi = true;
    sureDolduBildirGonder(aktif);
  }
}

/* Bir kişinin kartında/satırında gösterilecek canlı süre metni:
   görüşülüyorsa "Görüşme", başkan beklemedeyse (o kişi aktifse) "Bekleme".
   İkisi de geçerli değilse null döner (span gizlenir). */
function canliSureMetni(k, kisiId) {
  if (!k) return null;
  const aktifMi = oturum.aktifKisiId === kisiId;
  if (aktifMi && oturum.durum === "beklemede") {
    return { sinif: "beklemede", metin: "⏸ Bekleme " + sureBicimle(gecenBeklemeMs(k)) };
  }
  if (aktifMi && oturum.durum === "gorusmede" && (k.kutu || "liste") === "gorusmede") {
    return { sinif: "gorusmede", metin: "⏱ Görüşme " + sureBicimle(gecenMs(k)) };
  }
  return null;
}

/* Sayfadaki tüm canlı süre etiketlerini günceller (tablo satırları, kutu kartları, aktif kart) */
function canliSureleriGuncelle() {
  document.querySelectorAll(".canli-sure").forEach((span) => {
    const kisiId = span.dataset.canliSureId;
    const k = oturum.kisiler?.[kisiId];
    let bilgi = canliSureMetni(k, kisiId);
    // Başkanın Sekreterya listesinde canlı süre (görüşme/bekleme) gösterilmez; bu yalnızca Sekreterya ekranında görünür
    if (bilgi && span.closest("#okumaGovde")) bilgi = null;
    span.hidden = !bilgi;
    span.className = "canli-sure" + (bilgi ? " " + bilgi.sinif : "");
    span.textContent = bilgi ? bilgi.metin : "";
  });
}

setInterval(() => { aktifSureGoster(); canliSureleriGuncelle(); }, 1000);

/* ============================================================
   4) YÖNLENDİRME (#/ , #/baskan , #/sekreterya)
   ============================================================ */

function ekranAyarla() {
  const yol = location.hash.replace("#/", "") || "";
  const eslesme = { "": "ekranGiris", baskan: "ekranBaskan", sekreterya: "ekranSekreterya" };
  const hedef = eslesme[yol] || "ekranGiris";
  document.querySelectorAll(".ekran").forEach((e) => e.classList.toggle("aktif", e.id === hedef));
  window.scrollTo(0, 0);

  // Bu cihazın rolünü hatırla: "sıradaki gelebilir" bildirimi yalnızca
  // sekreterya olarak işaretlenmiş cihaza gider.
  if (hedef === "ekranSekreterya") {
    rolKaydet("sekreterya");
    bildirimBannerGuncelle();
  } else if (hedef === "ekranBaskan") {
    rolKaydet("baskan");
    sureBildirimUIYenile();
  }
}
window.addEventListener("hashchange", ekranAyarla);

/* ============================================================
   4b) BİLDİRİM
   Başkan "sıradaki kişi gelebilir" deyince, bu cihaz sekreterya
   olarak işaretliyse tarayıcı bildirimi + titreşim + kısa bir bip sesi.
   Not: Bu, sayfa açıkken (arka planda bile) çalışan bir bildirimdir —
   sunucu tarafından gönderilen gerçek "push" değildir; sayfa tamamen
   kapatılırsa bildirim gitmez.
   ============================================================ */

const ROL_ANAHTARI = "gorusme_rol";

function rolKaydet(rol) {
  try { localStorage.setItem(ROL_ANAHTARI, rol); } catch { /* yoksay */ }
}
function buCihazSekreteryaMi() {
  try { return localStorage.getItem(ROL_ANAHTARI) === "sekreterya"; } catch { return false; }
}
function buCihazBaskanMi() {
  try { return localStorage.getItem(ROL_ANAHTARI) === "baskan"; } catch { return false; }
}

/* Başkanın "süre doldu" bildirimini açıp kapatabildiği ayar (varsayılan: açık) */
const SURE_BILDIRIM_ANAHTARI = "gorusme_sure_bildirim_acik";

function sureBildirimAcikMi() {
  try {
    const deger = localStorage.getItem(SURE_BILDIRIM_ANAHTARI);
    return deger === null ? true : deger === "1";
  } catch { return true; }
}
function sureBildirimAyarla(acik) {
  try { localStorage.setItem(SURE_BILDIRIM_ANAHTARI, acik ? "1" : "0"); } catch { /* yoksay */ }
}

/* Ayarlar kartındaki checkbox + uyarı metnini günceller (başkan ekranına girince çağrılır) */
function sureBildirimUIYenile() {
  const kutu = el("sureBildirimToggle");
  if (!kutu) return;
  kutu.checked = sureBildirimAcikMi();
  const not = el("sureBildirimNot");
  if (not) not.hidden = !(bildirimDestekliMi() && Notification.permission === "denied");
}

function bildirimDestekliMi() {
  return "Notification" in window;
}

async function bildirimIzniIste() {
  if (!bildirimDestekliMi() || Notification.permission !== "default") return;
  try { await Notification.requestPermission(); } catch { /* yoksay */ }
  bildirimBannerGuncelle();
}

function bildirimBannerGuncelle() {
  const banner = el("bildirimBanner");
  if (!banner) return;
  if (!bildirimDestekliMi()) { banner.hidden = true; return; }
  banner.hidden = Notification.permission === "granted";
  const metin = banner.querySelector(".bildirim-metin");
  const btn = el("bildirimIzinBtn");
  if (Notification.permission === "denied") {
    metin.textContent = "🔕 Bildirimler engellenmiş. Açmak için tarayıcı site ayarlarından izin vermeniz gerekir.";
    btn.hidden = true;
  } else {
    metin.textContent = "🔔 \"Sıradaki kişi gelebilir\" olduğunda bu cihaza bildirim gitmesi için izin verin.";
    btn.hidden = false;
  }
}

/* Kısa, nazik bir bip — dosya gerektirmez */
function bipCal() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const kazanc = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(kazanc);
    kazanc.connect(ctx.destination);
    kazanc.gain.setValueAtTime(0.0001, ctx.currentTime);
    kazanc.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    kazanc.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
  } catch { /* yoksay */ }
}

/* Başkan "sıradaki gelebilir"i aktifleştirince çağrılır */
function siradakiBildirimGonder() {
  if (!buCihazSekreteryaMi()) return;

  bipCal();
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

  if (!bildirimDestekliMi() || Notification.permission !== "granted") return;
  const aday = siradakiKisi();
  const govde = aday
    ? `Sıradaki: ${tamAd(aday)}${aday.saat ? " · " + aday.saat : ""}`
    : "Sırada bekleyen kişiyi yönlendirin.";
  try {
    const bildirim = new Notification("Sıradaki kişi gelebilir", {
      body: govde,
      tag: "gorusme-siradaki",
      renotify: true,
    });
    bildirim.onclick = () => { window.focus(); bildirim.close(); };
  } catch { /* yoksay */ }
}

/* 10 dakikalık süre dolunca çağrılır — yalnızca başkan olarak işaretli
   cihazda ve "Süre doldu bildirimi" ayarı açıksa ses + titreşim + bildirim */
function sureDolduBildirGonder(aktif) {
  if (!buCihazBaskanMi() || !sureBildirimAcikMi()) return;

  bipCal();
  if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);

  if (!bildirimDestekliMi() || Notification.permission !== "granted") return;
  try {
    const bildirim = new Notification("Süre doldu", {
      body: `${tamAd(aktif)} için 10 dakikalık süre doldu.`,
      tag: "gorusme-sure-doldu",
      renotify: true,
    });
    bildirim.onclick = () => { window.focus(); bildirim.close(); };
  } catch { /* yoksay */ }
}

/* ============================================================
   5) BAŞKAN İŞLEMLERİ
   ============================================================ */

/* Süreyi durdur (beklemede / bitti) */
function sureDurdurYollari(kisiId) {
  const k = oturum.kisiler?.[kisiId];
  if (!k || !k.gorusmeBaslangic) return {};
  return {
    [`kisiler/${kisiId}/birikenMs`]: gecenMs(k),
    [`kisiler/${kisiId}/gorusmeBaslangic`]: null,
  };
}

/* Bekleme süresini durdur (görüşmeye dönünce / bitince) */
function beklemeDurdurYollari(kisiId) {
  const k = oturum.kisiler?.[kisiId];
  if (!k || !k.beklemeBaslangic) return {};
  return {
    [`kisiler/${kisiId}/birikenBeklemeMs`]: gecenBeklemeMs(k),
    [`kisiler/${kisiId}/beklemeBaslangic`]: null,
  };
}

async function durumaGec(durum) {
  const yollar = { durum };
  let aktifId = oturum.aktifKisiId;

  if (durum === "gorusmede") {
    // Aktif kişi yoksa "Görüşmede" kutusundakini, o da yoksa sıradakini al
    if (!aktifId || !oturum.kisiler?.[aktifId]) {
      const aday = kisiListesi("gorusmede")[0] || siradakiKisi();
      if (aday) {
        aktifId = aday.id;
        yollar["aktifKisiId"] = aday.id;
        yollar[`kisiler/${aday.id}/kutu`] = "gorusmede";
        if (!aday.birikenMs) yollar[`kisiler/${aday.id}/birikenMs`] = 0;
      }
    }
    // Beklemeden dönüyorsa bekleme süresi birikip durur, görüşme süresi devam eder
    Object.assign(yollar, beklemeDurdurYollari(aktifId));
    if (aktifId && !oturum.kisiler?.[aktifId]?.gorusmeBaslangic) {
      yollar[`kisiler/${aktifId}/gorusmeBaslangic`] = Date.now();
    }
    yollar["siradakiHazir"] = false;
  }

  if (durum === "beklemede") {
    Object.assign(yollar, sureDurdurYollari(aktifId));
    if (aktifId && !oturum.kisiler?.[aktifId]?.beklemeBaslangic) {
      yollar[`kisiler/${aktifId}/beklemeBaslangic`] = Date.now();
    }
    yollar["siradakiHazir"] = false;
  }

  if (durum === "bitti") {
    // Otomatik akış: görüşülen kişi "Bitti" kutusuna düşer
    Object.assign(yollar, sureDurdurYollari(aktifId));
    Object.assign(yollar, beklemeDurdurYollari(aktifId));
    if (aktifId && oturum.kisiler?.[aktifId]) {
      yollar[`kisiler/${aktifId}/kutu`] = "bitti";
    }
    yollar["aktifKisiId"] = null;
    yollar["siradakiHazir"] = true;
  }

  await depo.guncelle(yollar);
}

async function siradakiniAl() {
  const aday = siradakiKisi();
  if (!aday) {
    el("siradakiKimText").textContent = "Sırada bekleyen kimse yok";
    return;
  }
  await depo.guncelle({
    durum: "gorusmede",
    aktifKisiId: aday.id,
    siradakiHazir: false,
    [`kisiler/${aday.id}/kutu`]: "gorusmede",
    [`kisiler/${aday.id}/birikenMs`]: 0,
    [`kisiler/${aday.id}/gorusmeBaslangic`]: Date.now(),
    [`kisiler/${aday.id}/birikenBeklemeMs`]: 0,
    [`kisiler/${aday.id}/beklemeBaslangic`]: null,
  });
}

/* ============================================================
   6) SEKRETERYA İŞLEMLERİ
   ============================================================ */

async function kisiEkle({ ad, soyad, saat, not }) {
  const id = "k" + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
  await depo.guncelle({
    [`kisiler/${id}`]: {
      ad: ad || "",
      soyad: soyad || "",
      saat: saat || "",
      not: not || "",
      kutu: "liste",
      sira: sonrakiSira(),
      birikenMs: 0,
      gorusmeBaslangic: null,
      birikenBeklemeMs: 0,
      beklemeBaslangic: null,
    },
  });
}

async function kisiAlanGuncelle(id, alan, deger) {
  await depo.guncelle({ [`kisiler/${id}/${alan}`]: deger });
}

async function kisiSil(id) {
  const yollar = { [`kisiler/${id}`]: null };
  if (oturum.aktifKisiId === id) {
    yollar["aktifKisiId"] = null;
    yollar["durum"] = "bos";
  }
  await depo.guncelle(yollar);
}

/* Kişiyi bir kutuya taşı (sürükle-bırak veya "geri al") */
async function kutuyaTasi(id, kutu) {
  const k = oturum.kisiler?.[id];
  if (!k || (k.kutu || "liste") === kutu) return;

  const yollar = { [`kisiler/${id}/kutu`]: kutu };

  if (kutu === "gorusmede") {
    // "Görüşmede" kutusunda tek kişi durur; önceki listeye döner
    kisiListesi("gorusmede")
      .filter((x) => x.id !== id)
      .forEach((x) => {
        yollar[`kisiler/${x.id}/kutu`] = "liste";
        Object.assign(yollar, sureDurdurYollari(x.id));
        Object.assign(yollar, beklemeDurdurYollari(x.id));
      });

    yollar["aktifKisiId"] = id;
    yollar["durum"] = "gorusmede";
    yollar["siradakiHazir"] = false;
    yollar[`kisiler/${id}/birikenMs`] = 0;
    yollar[`kisiler/${id}/gorusmeBaslangic`] = Date.now();
    yollar[`kisiler/${id}/birikenBeklemeMs`] = 0;
    yollar[`kisiler/${id}/beklemeBaslangic`] = null;
  } else {
    Object.assign(yollar, sureDurdurYollari(id));
    Object.assign(yollar, beklemeDurdurYollari(id));
    if (oturum.aktifKisiId === id) {
      yollar["aktifKisiId"] = null;
      if (kutu === "bitti") {
        yollar["durum"] = "bitti";
        yollar["siradakiHazir"] = true;
      }
    }
  }

  await depo.guncelle(yollar);
}

/* ============================================================
   7) EKRAN ÇİZİMİ
   ============================================================ */

function ciz() {
  cizBaskan();
  cizSekreterya();
  cizOkumaTablosu();
  cizOkumaBittiTablosu();
  canliSureleriGuncelle();
}

/* --- Başkan ekranı --- */
function cizBaskan() {
  const aktif = oturum.kisiler?.[oturum.aktifKisiId];
  const durum = oturum.durum || "bos";

  const kart = el("aktifKisiKart");
  kart.className = "aktif-kart " + (aktif ? durum : "");
  el("aktifKisiAd").textContent = aktif ? tamAd(aktif) : "Görüşme yok";
  aktifSureGoster();

  document.querySelectorAll(".durum-btn").forEach((b) => {
    b.classList.toggle("secili", b.dataset.durum === durum);
  });
  el("beklemedeAciklama").textContent = aktif
    ? `${tamAd(aktif)} çıktı, başkan not alıyor`
    : "Kişi çıktı, başkan notlarını alıyor";

  const btn = el("siradakiBtn");
  const aday = siradakiKisi();
  btn.disabled = !oturum.siradakiHazir || !aday;   // kimse beklemiyorsa basılmasın
  el("siradakiKimText").textContent = !oturum.siradakiHazir
    ? "— görüşme bitince aktifleşir"
    : aday
      ? `Sıradaki: ${tamAd(aday)}${aday.saat ? " · " + aday.saat : ""}`
      : "Sırada bekleyen kimse yok";
}

/* --- Sekreterya: iki kutu (Görüşmede / Sıradaki) --- */
function cizSekreterya() {
  const rozet = el("baskanRozet");
  const durum = oturum.durum || "bos";
  const rozetMetin = {
    gorusmede: "Görüşmede", beklemede: "Beklemede",
    bitti: "Görüşme bitti", bos: "Beklemede değil",
  };
  rozet.className = "rozet " + durum;
  rozet.querySelector(".rozet-metin").textContent = rozetMetin[durum] || "—";

  ["gorusmede", "siradaki"].forEach((kutu) => {
    const hedef = document.querySelector(`.kutu-icerik[data-drop="${kutu}"]`);
    const kisiler = kisiListesi(kutu);
    hedef.innerHTML = "";

    if (!kisiler.length) {
      hedef.innerHTML = `<p class="kutu-bos">Kişiyi buraya sürükleyin</p>`;
      return;
    }

    kisiler.forEach((k) => {
      const kart = document.createElement("div");
      kart.className = "kisi-kart";
      kart.dataset.id = k.id;
      kart.innerHTML = `
        <span class="k-ad"></span>
        <span class="k-saat"></span>
        <span class="canli-sure" data-canli-sure-id="${k.id}" hidden></span>
        <button class="k-geri" title="Listeye geri al">↩</button>`;
      kart.querySelector(".k-ad").textContent = tamAd(k);
      kart.querySelector(".k-saat").textContent = k.saat || "";
      kart.querySelector(".k-geri").addEventListener("click", (e) => {
        e.stopPropagation();
        kutuyaTasi(k.id, "liste");
      });
      surukleBagla(kart, k.id);
      hedef.appendChild(kart);
    });
  });

  cizTablo();
  cizBittiTablo();
}

/* Ad/Soyad/Saat/Not + Sil düzenlenebilir satırı oluşturur (ana tablo + bitti tablosu ortak) */
function tabloSatirOlustur(k, { etiketGoster, sureGoster }) {
  const kutu = k.kutu || "liste";
  const tr = document.createElement("tr");
  tr.dataset.id = k.id;
  if (kutu !== "liste") tr.classList.add("baska-kutuda");

  const tdTut = document.createElement("td");
  tdTut.className = "tut";
  tdTut.textContent = "⠿";
  tdTut.title = "Yukarıdaki kutulara sürükleyin";
  tr.appendChild(tdTut);

  [["ad", "Ad"], ["soyad", "Soyad"], ["saat", "Saat"], ["not", "Not"]].forEach(([alan, ph]) => {
    const td = document.createElement("td");
    const inp = document.createElement("input");
    inp.className = "hucre-input";
    if (alan === "saat") {
      inp.type = "time";
      inp.step = "600";
    } else {
      inp.placeholder = ph;
    }
    inp.value = k[alan] || "";
    inp.addEventListener("change", () => kisiAlanGuncelle(k.id, alan, inp.value));
    td.appendChild(inp);

    if (alan === "ad") {
      const odadanCikti = oturum.aktifKisiId === k.id && oturum.durum === "beklemede";
      if (etiketGoster && odadanCikti) {
        // Başkan beklemedeyken aktif kişi odadan çıkmış sayılır: "Görüşmede" değil "Beklemede" görünsün
        const et = document.createElement("span");
        et.className = "kutu-etiket beklemede";
        et.textContent = "Beklemede";
        td.appendChild(et);
      } else if (etiketGoster && kutu !== "liste") {
        const et = document.createElement("span");
        et.className = "kutu-etiket " + kutu;
        et.textContent = KUTU_ADI[kutu];
        td.appendChild(et);
      }
      if (sureGoster) {
        // Görüşme gerçekte ne kadar sürmüş — isminin yanında
        const sureSpan = document.createElement("span");
        sureSpan.className = "sure-etiket";
        sureSpan.textContent = "⏱ " + sureBicimle(gecenMs(k));
        td.appendChild(sureSpan);

        // Başkanın bu kişi için notlarını alırken beklemede geçirdiği toplam süre
        const beklemeMs = k.birikenBeklemeMs || 0;
        if (beklemeMs > 0) {
          const beklemeSpan = document.createElement("span");
          beklemeSpan.className = "sure-etiket sure-etiket-bekleme";
          beklemeSpan.textContent = "⏸ " + sureBicimle(beklemeMs);
          td.appendChild(beklemeSpan);
        }
      }
      // Şu an görüşülüyor/beklemede ise: saatin yanında canlı süre
      const canliSpan = document.createElement("span");
      canliSpan.className = "canli-sure";
      canliSpan.dataset.canliSureId = k.id;
      canliSpan.hidden = true;
      td.appendChild(canliSpan);
    }
    tr.appendChild(td);
  });

  const tdIslem = document.createElement("td");
  const sil = document.createElement("button");
  sil.className = "sil-btn";
  sil.textContent = "Sil";
  sil.addEventListener("click", () => {
    if (confirm(`"${tamAd(k)}" listeden silinsin mi?`)) kisiSil(k.id);
  });
  tdIslem.appendChild(sil);
  tr.appendChild(tdIslem);

  surukleBagla(tdTut, k.id, tr);
  return tr;
}

/* --- Sekreterya: ana tablo (görüşmede + bekleyenler) --- */
function cizTablo() {
  const govde = el("tabloGovde");
  const hepsi = kisiListesiAktif();
  govde.innerHTML = "";
  el("tabloBos").style.display = hepsi.length ? "none" : "block";
  hepsi.forEach((k) => govde.appendChild(tabloSatirOlustur(k, { etiketGoster: true, sureGoster: false })));
}

/* --- Sekreterya: Biten görüşmeler (ayrı, katlanır tablo) --- */
function cizBittiTablo() {
  const govde = el("bittiGovde");
  const hepsi = kisiListesiBitti();
  govde.innerHTML = "";
  el("bittiBos").hidden = hepsi.length > 0;
  el("bittiSayac").textContent = String(hepsi.length);
  hepsi.forEach((k) => govde.appendChild(tabloSatirOlustur(k, { etiketGoster: false, sureGoster: true })));
}

/* Ad/Soyad/Saat/[Durum]/Not salt-okunur satırı oluşturur (başkan ekranı) */
function okumaSatirOlustur(k, { durumGoster, sureGoster }) {
  const kutu = k.kutu || "liste";
  const tr = document.createElement("tr");

  const tdAd = document.createElement("td");
  tdAd.textContent = k.ad || "";
  if (sureGoster) {
    // Görüşme gerçekte ne kadar sürmüş — isminin yanında
    const sureSpan = document.createElement("span");
    sureSpan.className = "sure-etiket";
    sureSpan.textContent = "⏱ " + sureBicimle(gecenMs(k));
    tdAd.appendChild(sureSpan);

    // Başkanın bu kişi için notlarını alırken beklemede geçirdiği toplam süre
    const beklemeMs = k.birikenBeklemeMs || 0;
    if (beklemeMs > 0) {
      const beklemeSpan = document.createElement("span");
      beklemeSpan.className = "sure-etiket sure-etiket-bekleme";
      beklemeSpan.textContent = "⏸ " + sureBicimle(beklemeMs);
      tdAd.appendChild(beklemeSpan);
    }
  }
  // Şu an görüşülüyor/beklemede ise: isminin yanında canlı süre
  const canliSpan = document.createElement("span");
  canliSpan.className = "canli-sure";
  canliSpan.dataset.canliSureId = k.id;
  canliSpan.hidden = true;
  tdAd.appendChild(canliSpan);
  tr.appendChild(tdAd);

  [k.soyad || "", k.saat || ""].forEach((deger) => {
    const td = document.createElement("td");
    td.textContent = deger;
    tr.appendChild(td);
  });

  if (durumGoster) {
    // Durum — telefonda da görünsün diye Not'tan önce
    const tdDurum = document.createElement("td");
    const odadanCikti = oturum.aktifKisiId === k.id && oturum.durum === "beklemede";
    if (odadanCikti) {
      // Başkan beklemedeyken aktif kişi odadan çıkmış sayılır: "Görüşmede" değil "Beklemede" görünsün
      const et = document.createElement("span");
      et.className = "kutu-etiket beklemede";
      et.textContent = "Beklemede";
      tdDurum.appendChild(et);
    } else if (kutu === "liste") {
      tdDurum.textContent = "Bekliyor";
    } else {
      const et = document.createElement("span");
      et.className = "kutu-etiket " + kutu;
      et.textContent = KUTU_ADI[kutu];
      tdDurum.appendChild(et);
    }
    tr.appendChild(tdDurum);
  }

  const tdNot = document.createElement("td");
  tdNot.textContent = k.not || "";
  tr.appendChild(tdNot);

  return tr;
}

/* --- Başkanın sayfasındaki salt-okunur liste (her zaman açık) --- */
function cizOkumaTablosu() {
  const govde = el("okumaGovde");
  const hepsi = kisiListesiAktif();
  govde.innerHTML = "";
  el("okumaBos").style.display = hepsi.length ? "none" : "block";
  hepsi.forEach((k) => govde.appendChild(okumaSatirOlustur(k, { durumGoster: true, sureGoster: false })));
}

/* --- Başkanın sayfasındaki Biten görüşmeler (ayrı, katlanır tablo) --- */
function cizOkumaBittiTablosu() {
  const govde = el("okumaBittiGovde");
  const hepsi = kisiListesiBitti();
  govde.innerHTML = "";
  el("okumaBittiBos").hidden = hepsi.length > 0;
  el("okumaBittiSayac").textContent = String(hepsi.length);
  hepsi.forEach((k) => govde.appendChild(okumaSatirOlustur(k, { durumGoster: false, sureGoster: true })));
}

/* ============================================================
   8) SÜRÜKLE-BIRAK
   Pointer olayları ile: fare + dokunmatik aynı kodla çalışır.
   ============================================================ */

let hayalet = null;
let sonHedef = null;
let kaydirmaSayaci = null;
let sonKonum = { x: 0, y: 0 };

/* Sürükleme sırasında ekran kenarına yaklaşınca sayfayı kendiliğinden kaydır
   (telefonda kişiyi yukarıdaki kutuya taşımak için gerekli) */
function kaydirmaBaslat() {
  if (kaydirmaSayaci) return;
  kaydirmaSayaci = setInterval(() => {
    const esik = 90;
    if (sonKonum.y < esik) window.scrollBy(0, -14);
    else if (sonKonum.y > window.innerHeight - esik) window.scrollBy(0, 14);
  }, 16);
}
function kaydirmaDurdur() {
  clearInterval(kaydirmaSayaci);
  kaydirmaSayaci = null;
}

function surukleBagla(tutamac, kisiId, satir = null) {
  tutamac.style.touchAction = "none";

  tutamac.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest(".k-geri")) return;

    const baslangic = { x: e.clientX, y: e.clientY };
    let basladi = false;
    const kaynak = satir || tutamac.closest(".kisi-kart") || tutamac;

    const hareket = (ev) => {
      if (!basladi) {
        if (Math.hypot(ev.clientX - baslangic.x, ev.clientY - baslangic.y) < 6) return;
        basladi = true;
        suruklenenId = kisiId;
        kaynak.classList.add(satir ? "satir-tasiniyor" : "tasiniyor");
        hayaletOlustur(kisiId);
        kaydirmaBaslat();
      }
      ev.preventDefault();
      sonKonum = { x: ev.clientX, y: ev.clientY };
      hayaletTasi(ev.clientX, ev.clientY);
      hedefVurgula(ev.clientX, ev.clientY);
    };

    const birak = async (ev) => {
      // Dinleyiciler window'da: sürüklenen satır yeniden çizilse bile bırakma yakalanır
      window.removeEventListener("pointermove", hareket);
      window.removeEventListener("pointerup", birak);
      window.removeEventListener("pointercancel", birak);

      kaydirmaDurdur();
      if (!basladi) return;
      kaynak.classList.remove("satir-tasiniyor", "tasiniyor");
      hayaletKaldir();
      vurguTemizle();

      const kutu = hedefBul(ev.clientX, ev.clientY);
      suruklenenId = null;
      if (kutu) await kutuyaTasi(kisiId, kutu);
    };

    window.addEventListener("pointermove", hareket, { passive: false });
    window.addEventListener("pointerup", birak);
    window.addEventListener("pointercancel", birak);
  });
}

function hayaletOlustur(kisiId) {
  const k = oturum.kisiler?.[kisiId];
  hayalet = document.createElement("div");
  hayalet.textContent = tamAd(k);
  Object.assign(hayalet.style, {
    position: "fixed", zIndex: 90, pointerEvents: "none",
    padding: "9px 14px", borderRadius: "10px", background: "#1e293b",
    color: "#fff", fontWeight: "600", fontSize: ".92rem",
    boxShadow: "0 8px 24px rgba(0,0,0,.28)", transform: "translate(-50%,-140%)",
  });
  document.body.appendChild(hayalet);
}
function hayaletTasi(x, y) {
  if (hayalet) { hayalet.style.left = x + "px"; hayalet.style.top = y + "px"; }
}
function hayaletKaldir() { hayalet?.remove(); hayalet = null; }

function hedefBul(x, y) {
  const altta = document.elementFromPoint(x, y);
  const alan = altta?.closest("[data-drop]");
  return alan ? alan.dataset.drop : null;
}
function hedefVurgula(x, y) {
  const altta = document.elementFromPoint(x, y);
  const alan = altta?.closest("[data-drop]");
  if (alan === sonHedef) return;
  vurguTemizle();
  sonHedef = alan;
  alan?.classList.add("uzerinde");
}
function vurguTemizle() {
  document.querySelectorAll("[data-drop].uzerinde").forEach((e) => e.classList.remove("uzerinde"));
  sonHedef = null;
}

/* ============================================================
   9) OLAY BAĞLAMALARI
   ============================================================ */

document.querySelectorAll(".durum-btn").forEach((b) => {
  b.addEventListener("click", () => durumaGec(b.dataset.durum));
});
el("siradakiBtn").addEventListener("click", siradakiniAl);

el("bildirimIzinBtn").addEventListener("click", async () => {
  if (!bildirimDestekliMi()) return;
  try { await Notification.requestPermission(); } catch { /* yoksay */ }
  bildirimBannerGuncelle();
});

el("sureBildirimToggle").addEventListener("change", async (e) => {
  const acik = e.target.checked;
  sureBildirimAyarla(acik);
  if (acik && bildirimDestekliMi() && Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch { /* yoksay */ }
  }
  sureBildirimUIYenile();
});
sureBildirimUIYenile();

/* Ayarlar popup: sağ üstteki ⚙️ ikonuyla açılır, dışına/✕'e tıklayınca veya Esc ile kapanır */
function ayarlarModalAc() {
  el("ayarlarModal").hidden = false;
  sureBildirimUIYenile();
}
function ayarlarModalKapat() {
  el("ayarlarModal").hidden = true;
}
el("ayarlarBtn").addEventListener("click", ayarlarModalAc);
el("ayarlarKapatBtn").addEventListener("click", ayarlarModalKapat);
el("ayarlarModal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) ayarlarModalKapat();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !el("ayarlarModal").hidden) ayarlarModalKapat();
});

/* Bitti görüşmeler bölümü: buton gibi aç/kapa (durum yalnızca bu tarayıcıda tutulur) */
function bittiPaneliBagla(toggleId, kapsayiciId) {
  const toggle = el(toggleId);
  const kapsayici = el(kapsayiciId);
  toggle.addEventListener("click", () => {
    const acilacak = kapsayici.hidden;
    kapsayici.hidden = !acilacak;
    toggle.setAttribute("aria-expanded", String(acilacak));
  });
}
bittiPaneliBagla("bittiToggle", "bittiKapsayici");
bittiPaneliBagla("okumaBittiToggle", "okumaBittiKapsayici");

el("ekleForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const veri = {
    ad: f.ad.value.trim(),
    soyad: f.soyad.value.trim(),
    saat: f.saat.value.trim(),
    not: f.not.value.trim(),
  };
  if (!veri.ad) return;
  f.reset();
  f.ad.focus();
  await kisiEkle(veri);
});

/* ============================================================
   10) BAŞLAT
   ============================================================ */

(async function baslat() {
  ekranAyarla();
  baglantiGoster("bekle");

  try {
    depo = FIREBASE_AYARLI ? await firebaseDepoKur() : yerelDepoKur();
  } catch (hata) {
    console.error("Firebase bağlantısı kurulamadı, yerel moda geçiliyor:", hata);
    depo = yerelDepoKur();
  }

  let ilkVeriGeldi = false;
  let oncekiSiradakiHazir = false;

  depo.abone((veri) => {
    // Sekreterya bir hücreye yazarken karşı taraftan güncelleme gelirse
    // imleç ve henüz kaydedilmemiş metin kaybolmasın diye hatırlıyoruz.
    const odak = document.activeElement;
    const odakBilgi = odak?.classList?.contains("hucre-input")
      ? {
          id: odak.closest("tr")?.dataset.id,
          etiket: odak.placeholder,
          deger: odak.value,
          yer: odak.selectionStart,
        }
      : null;

    // "Sıradaki gelebilir" false→true geçişini yakala (başkan az önce Bitti dedi)
    const yeniSiradakiHazir = !!veri.siradakiHazir;
    const gecisOldu = ilkVeriGeldi && !oncekiSiradakiHazir && yeniSiradakiHazir;
    oncekiSiradakiHazir = yeniSiradakiHazir;
    ilkVeriGeldi = true;

    oturum = veri;
    ciz();

    if (odakBilgi?.id) {
      // Satır ana tabloda veya Bitti tablosunda olabilir — ikisinde de ara
      const yeni = document.querySelector(
        `tr[data-id="${odakBilgi.id}"] .hucre-input[placeholder="${odakBilgi.etiket}"]`
      );
      if (yeni) {
        yeni.value = odakBilgi.deger;   // yazılmakta olan metni koru
        yeni.focus();
        try { yeni.setSelectionRange(odakBilgi.yer, odakBilgi.yer); } catch { /* yoksay */ }
      }
    }

    if (gecisOldu) siradakiBildirimGonder();
  });
})();
