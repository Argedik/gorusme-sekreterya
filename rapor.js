// ============================================================
//  Rapor — günün görüşmelerini maddelere döker.
//
//  Rapor CANLIDIR: maddeler her veri değişiminde yeniden üretilir, yani
//  sekreterya bir adı/saati/notu düzeltince rapor anında düzelir.
//
//  Kullanıcının elle yaptıkları buna rağmen korunur. Her otomatik maddenin
//  kararlı bir kimliği var (örn. "gorusme:k17", "olay:g3"); taslakta yalnızca
//  kullanıcının müdahalesi saklanır:
//    - silinen : rapordan çıkarılan madde kimlikleri
//    - eller   : elle yazılmış metinler (bunlar artık otomatik güncellenmez)
//    - serbest : kullanıcının kendi eklediği maddeler
//  Böylece veriden gelen her şey taze kalır, elle yazılan hiçbir şey kaybolmaz.
//
//  Kaynak veriye dokunulmaz: raporda madde silmek listeden kişi silmez.
// ============================================================

import { tamAd, sureYaz, saatYaz, tarihYaz } from "./ortak.js?v=10";

const TASLAK_ANAHTARI = "gorusme_rapor_taslak_v2";

let oturumVer = () => ({});
let taslak = { silinen: [], eller: {}, serbest: [] };
let sayac = 0;

const el = (id) => document.getElementById(id);

/* ------------------------------------------------------------
   Görünüm anahtarları — raporda ne yazacağını belirler.

   sureGoster: süreler, giriş/bitiş saatleri, gecikmeler. Görüşmelerde
   aksama olan bir günde bunlar raporu yanıltıyor; kapatılınca rapor
   "kimlerle görüşüldü" özetine iner. Açılınca hepsi geri gelir.
   VARSAYILAN KAPALI (2026-07-29): başkan böyle istedi.

   olayGoster: "Değişiklikler ve olaylar" bölümü (olay günlüğü).

   Bu cihazda saklanır — taslak gibi kişisel bir görünüm tercihi.
   ------------------------------------------------------------ */
const GORUNUM_ANAHTARI = "gorusme_rapor_gorunum_v1";

let gorunum = { sure: false, olay: true };

function gorunumYukle() {
  try {
    const veri = JSON.parse(localStorage.getItem(GORUNUM_ANAHTARI));
    if (veri && typeof veri === "object") {
      gorunum = { sure: !!veri.sure, olay: veri.olay !== false };
    }
  } catch { /* varsayılanla devam */ }
}

function gorunumYaz() {
  try { localStorage.setItem(GORUNUM_ANAHTARI, JSON.stringify(gorunum)); } catch { /* yoksay */ }
}

/* ============================================================
   1) METİN ÜRETİMİ
   ============================================================ */

/* Planlanan saate göre kaç dakika sapma var? (+ gecikme, − erken) */
function sapmaDk(saat, t) {
  const [ss, dd] = String(saat || "").split(":").map(Number);
  if (!Number.isFinite(ss) || !Number.isFinite(dd) || !t) return null;
  const d = new Date(t);
  const planlanan = new Date(d.getFullYear(), d.getMonth(), d.getDate(), ss, dd, 0, 0);
  return Math.round((t - planlanan.getTime()) / 60000);
}

function sapmaYaz(saat, t) {
  const fark = sapmaDk(saat, t);
  if (fark === null) return "";
  if (fark === 0) return " (saatinde)";
  return fark > 0 ? ` (${fark} dk gecikmeli)` : ` (${-fark} dk erken)`;
}

function rolYaz(rol) {
  return { baskan: "Başkan", sekreterya: "Sekreterya" }[rol] || "—";
}

function gorusmeMetni(k, sira) {
  // Süreler kapalıyken madde tek satıra iner: kiminle görüşüldüğü + notu.
  if (!gorunum.sure) {
    const parcalar = [`${sira}. ${tamAd(k)}`];
    if ((k.kutu || "liste") !== "bitti") parcalar.push("görüşme henüz bitmedi");
    if (k.not) parcalar.push(`not: ${k.not}`);
    return parcalar.join(" · ");
  }

  const satirlar = [`${sira}. ${tamAd(k)}`];
  satirlar.push(
    `Planlanan saat: ${k.saat || "—"} · Görüşmeye giriş: ${saatYaz(k.ilkGirisT)}` +
    sapmaYaz(k.saat, k.ilkGirisT)
  );
  satirlar.push(`Görüşme süresi: ${sureYaz(k.birikenMs || 0)}`);
  if (k.birikenBeklemeMs) {
    satirlar.push(`Başkan beklemede bıraktı: ${sureYaz(k.birikenBeklemeMs)}`);
  }
  if (k.bitisT) satirlar.push(`Görüşmenin bitişi: ${saatYaz(k.bitisT)}`);
  if ((k.kutu || "liste") !== "bitti") satirlar.push("Durum: görüşme henüz bitmedi");
  satirlar.push(`Not: ${k.not || "—"}`);
  return satirlar.join("\n");
}

function bekleyenMetni(k) {
  const parcalar = [tamAd(k)];
  // Planlanan saat de bir zaman bilgisi: süreler kapalıyken yazılmaz
  if (gorunum.sure) parcalar.push(k.saat ? `planlanan ${k.saat}` : "saat yok");
  parcalar.push("görüşülemedi");
  if (k.not) parcalar.push(`not: ${k.not}`);
  return parcalar.join(" · ");
}

/* Olay satırındaki süre eki — süreler kapalıyken hiç yazılmaz */
function olaySureEki(metin) {
  return gorunum.sure ? metin : "";
}

function olayMetni(g) {
  const bas = `${saatYaz(g.t)} · ${rolYaz(g.rol)} — `;
  const ad = g.ad || "";
  switch (g.tip) {
    case "hazir-liste":
      return bas + `hazır liste yüklendi: ${g.listeAdi || "liste"} (${g.adet || 0} kişi)`;
    case "eklendi":
      return bas + `listeye eklendi: ${ad}${g.saat ? ` (${g.saat})` : ""}`;
    case "silindi":
      return bas + `listeden silindi: ${ad}${g.saat ? ` (${g.saat})` : ""}`;
    case "liste-temizlendi":
      return bas + `liste tamamen temizlendi (${g.adet || 0} kayıt silindi)`;
    case "tablo-temizlendi":
      return bas + (g.kapsam === "bitti"
        ? `biten görüşmelerin tamamı silindi (${g.adet || 0} kayıt)`
        : `bekleyen liste tamamen silindi (${g.adet || 0} kayıt)`);
    case "duzenlendi":
      return bas + `${ad} — ${g.alan} değişti: "${g.eski || "boş"}" → "${g.yeni || "boş"}"`;
    case "gorusmeye-alindi":
      return bas + `${ad} görüşmeye alındı` + (g.cagrildi ? " (sıradaki çağrıldı)" : "");
    case "gorusmeye-donuldu":
      return bas + `${ad} ile görüşmeye devam edildi`;
    case "beklemeye-alindi":
      return bas + `${ad} beklemeye alındı` +
        olaySureEki(` (o ana kadar görüşme: ${sureYaz(g.sureMs || 0)})`);
    case "siraya-alindi":
      return bas + `${ad} "Sıradaki" kutusuna alındı`;
    case "listeye-alindi":
      return bas + `${ad} listeye geri alındı`;
    case "bitti":
      return bas + `${ad} ile görüşme bitti` +
        olaySureEki(` — süre ${sureYaz(g.sureMs || 0)}` +
          (g.beklemeMs ? `, beklemede ${sureYaz(g.beklemeMs)}` : ""));
    case "grup-usteye-alindi":
      return bas + `"${g.grup || "grup"}" listenin başına alındı (${g.adet || 0} kişi)`;
    default:
      return bas + `${g.tip}${ad ? `: ${ad}` : ""}`;
  }
}

/* Aynı kişi listeye birden fazla kez girmiş mi? (hazır liste iki kez yüklenince olur) */
function tekrarSayisi(kisiler) {
  const sayim = new Map();
  kisiler.forEach((k) => {
    const anahtar = `${(k.ad || "").trim()}|${(k.soyad || "").trim()}|${k.saat || ""}`.toLowerCase();
    sayim.set(anahtar, (sayim.get(anahtar) || 0) + 1);
  });
  return [...sayim.values()].reduce((t, n) => t + (n > 1 ? n - 1 : 0), 0);
}

/* ============================================================
   2) OTOMATİK MADDELER — her biri kararlı bir kimlikle
   ============================================================ */

export function otomatikMaddeler(oturum) {
  const kisiler = Object.entries(oturum.kisiler || {})
    .map(([id, k]) => ({ id, ...k }))
    .sort((a, b) => (a.sira || 0) - (b.sira || 0));
  const gunluk = Object.entries(oturum.gunluk || {})
    .map(([id, g]) => ({ id, ...g }))
    .sort((a, b) => (a.t || 0) - (b.t || 0));

  const maddeler = [];
  const ekle = (id, tur, metin) => { if (metin) maddeler.push({ id, tur, metin }); };

  const gorusulenler = kisiler
    .filter((k) => k.ilkGirisT)
    .sort((a, b) => (a.ilkGirisT || 0) - (b.ilkGirisT || 0));
  const bekleyenler = kisiler.filter((k) => !k.ilkGirisT);

  // Raporun günü: GÖRÜŞMELERİN yapıldığı gün. Hiç görüşme yoksa bugün.
  // (Liste yükleme/düzenleme olayları tarihi belirlemez — çizelge dün girilmiş olabilir.)
  const gunT = gorusulenler[0]?.ilkGirisT || Date.now();

  ekle("baslik", "baslik", `GÖRÜŞME RAPORU — ${tarihYaz(gunT)}`);

  // --- Özet ---
  const toplamSure = gorusulenler.reduce((t, k) => t + (k.birikenMs || 0), 0);
  const toplamBekleme = gorusulenler.reduce((t, k) => t + (k.birikenBeklemeMs || 0), 0);
  const bitenler = gorusulenler.filter((k) => (k.kutu || "liste") === "bitti");
  const zamaninda = gorusulenler.filter((k) => {
    const f = sapmaDk(k.saat, k.ilkGirisT);
    return f !== null && f <= 0;
  }).length;

  const ozet = [
    `Listedeki kayıt sayısı: ${kisiler.length}`,
    `Görüşülen: ${gorusulenler.length} · Tamamlanan: ${bitenler.length} · Görüşülemeyen: ${bekleyenler.length}`,
    // Süre/saat satırları yalnızca anahtar açıkken
    ...(gorunum.sure ? [
      `Toplam görüşme süresi: ${sureYaz(toplamSure)}`,
      gorusulenler.length
        ? `Ortalama görüşme süresi: ${sureYaz(toplamSure / gorusulenler.length)}`
        : null,
      toplamBekleme ? `Başkanın beklemede bıraktığı toplam süre: ${sureYaz(toplamBekleme)}` : null,
      gorusulenler.length ? `Saatinde (veya erken) giren: ${zamaninda}/${gorusulenler.length}` : null,
      gorusulenler.length ? `İlk giriş: ${saatYaz(gorusulenler[0].ilkGirisT)}` : null,
      bitenler.length ? `Son bitiş: ${saatYaz(Math.max(...bitenler.map((k) => k.bitisT || 0)))}` : null,
    ] : []),
  ].filter(Boolean);
  ekle("bolum:ozet", "bolum", "ÖZET");
  ekle("ozet", "ozet", ozet.join("\n"));

  // Çift kayıt uyarısı — sayı beklenenden fazlaysa nedeni burada görünür
  const tekrar = tekrarSayisi(kisiler);
  if (tekrar) {
    ekle("uyari:tekrar", "uyari",
      `⚠ Listede ${tekrar} tekrar kayıt var (aynı ad ve saat birden fazla kez geçiyor). ` +
      `Hazır liste birden fazla kez yüklenmiş olabilir; Sekreterya ekranından fazlalıkları silebilirsiniz.`);
  }

  // --- Görüşmeler ---
  if (gorusulenler.length) {
    ekle("bolum:gorusmeler", "bolum", `GÖRÜŞMELER (${gorusulenler.length})`);
    gorusulenler.forEach((k, i) => ekle(`gorusme:${k.id}`, "gorusme", gorusmeMetni(k, i + 1)));
  }

  // --- Görüşülemeyenler ---
  if (bekleyenler.length) {
    ekle("bolum:bekleyenler", "bolum", `GÖRÜŞÜLEMEYENLER (${bekleyenler.length})`);
    bekleyenler.forEach((k) => ekle(`bekleyen:${k.id}`, "bekleyen", bekleyenMetni(k)));
  }

  // --- Günlük: sıra değişiklikleri, düzenlemeler, durum geçişleri ---
  if (gorunum.olay) {
    ekle("bolum:olaylar", "bolum", `DEĞİŞİKLİKLER VE OLAYLAR (${gunluk.length})`);
    if (gunluk.length) {
      gunluk.forEach((g) => ekle(`olay:${g.id}`, "olay", olayMetni(g)));
    } else {
      ekle("olay:yok", "olay", "Bu oturumda kayıtlı olay yok.");
    }
  }

  return maddeler;
}

/* Otomatik maddelere kullanıcının müdahalesini uygular.
   cikan: şu anki veride üretilen ama kullanıcının çıkardığı madde sayısı
   (silinmiş kişilere ait eski kayıtlar sayılmaz, yoksa bilgi satırı yanıltır). */
function maddeleriHesapla() {
  const silinen = new Set(taslak.silinen);
  const oto = otomatikMaddeler(oturumVer());
  const cikan = oto.filter((m) => silinen.has(m.id)).length;
  const liste = oto
    .filter((m) => !silinen.has(m.id))
    .map((m) => {
      const elle = taslak.eller[m.id];
      return elle === undefined ? m : { ...m, metin: elle, elle: true };
    });
  taslak.serbest.forEach((s) => liste.push({ id: s.id, tur: "serbest", metin: s.metin, elle: true }));
  return { liste, cikan };
}

/* ============================================================
   3) TASLAK (yalnızca kullanıcı müdahalesi; bu cihazda saklanır)
   ============================================================ */

function taslakYukle() {
  // v1 taslakları (metnin tamamını saklayan eski yapı) artık kullanılmıyor:
  // veri değişince bayatlıyorlardı. Kalıntıyı temizle.
  try { localStorage.removeItem("gorusme_rapor_taslak_v1"); } catch { /* yoksay */ }
  try {
    const veri = JSON.parse(localStorage.getItem(TASLAK_ANAHTARI));
    taslak = {
      silinen: Array.isArray(veri?.silinen) ? veri.silinen : [],
      eller: veri?.eller && typeof veri.eller === "object" ? veri.eller : {},
      serbest: Array.isArray(veri?.serbest) ? veri.serbest : [],
    };
  } catch {
    taslak = { silinen: [], eller: {}, serbest: [] };
  }
}

function taslakYaz() {
  try {
    localStorage.setItem(TASLAK_ANAHTARI, JSON.stringify({ t: Date.now(), ...taslak }));
  } catch { /* yer yoksa yoksay */ }
}

let yazmaZamani = null;
function gecikmeliKaydet() {
  clearTimeout(yazmaZamani);
  yazmaZamani = setTimeout(taslakYaz, 400);
}

/* ============================================================
   4) KULLANICI İŞLEMLERİ
   ============================================================ */

function maddeDuzenle(id, metin, kutu) {
  if (id.startsWith("serbest:")) {
    const s = taslak.serbest.find((x) => x.id === id);
    if (s) s.metin = metin;
  } else {
    taslak.eller[id] = metin;
    kutu?.classList.add("elle");   // elle yazıldı işareti hemen görünsün
  }
  gecikmeliKaydet();
  bilgiYaz();
}

function maddeSil(id) {
  if (id.startsWith("serbest:")) {
    taslak.serbest = taslak.serbest.filter((x) => x.id !== id);
  } else if (!taslak.silinen.includes(id)) {
    taslak.silinen.push(id);
  }
  delete taslak.eller[id];
  taslakYaz();
  raporEkraniniYenile();
}

/* Rapordaki bütün maddeleri çıkarır. Kaynak veriye dokunmaz:
   listeden kişi silinmez, "🔄 Yeniden oluştur" hepsini geri getirir. */
function tumMaddeleriSil() {
  const adet = maddeleriHesapla().liste.length;
  if (!adet) {
    alert("Raporda çıkarılacak madde yok.");
    return;
  }
  if (!confirm(
    `Rapordaki ${adet} maddenin TAMAMI çıkarılacak.\n\n` +
    `Listeden kişi silinmez; "🔄 Yeniden oluştur" ile hepsi geri gelir.\n\nDevam edilsin mi?`
  )) return;

  taslak.serbest = [];
  taslak.eller = {};
  // Otomatik maddeler veriden yeniden üretildiği için tek tek "silindi" işaretlenir
  taslak.silinen = [...new Set([
    ...taslak.silinen,
    ...otomatikMaddeler(oturumVer()).map((m) => m.id),
  ])];
  taslakYaz();
  raporEkraniniYenile();
}

/* ============================================================
   5) EKRAN
   ============================================================ */

let sonCikan = 0;

/* Bilgi satırı DOM'dan sayar; yazarken de doğru kalsın diye her yerden çağrılabilir */
function bilgiYaz(cikan = null) {
  const bilgi = el("raporBilgi");
  const kapsayici = el("raporMaddeler");
  if (!bilgi || !kapsayici) return;
  if (cikan !== null) sonCikan = cikan;
  const n = kapsayici.children.length;
  const elle = kapsayici.querySelectorAll(".rapor-madde.elle").length;
  const parcalar = [`${n} madde`, "liste değiştikçe kendini günceller"];
  if (elle) parcalar.push(`${elle} madde elle yazıldı`);
  if (sonCikan) parcalar.push(`${sonCikan} madde çıkarıldı`);
  bilgi.textContent = parcalar.join(" · ");
  // Rapor bomboşsa "Tümünü sil" basılacak bir şey bulmaz
  const tumSil = el("raporTumunuSilBtn");
  if (tumSil) tumSil.disabled = n === 0;
}

function maddeOlustur(madde) {
  const kutu = document.createElement("div");
  kutu.dataset.id = madde.id;

  const metin = document.createElement("div");
  metin.className = "rapor-metin";
  // plaintext-only: yapıştırılan biçimli metin düz metne çevrilir
  metin.setAttribute("contenteditable", "plaintext-only");
  metin.textContent = madde.metin;
  metin.addEventListener("input", () => maddeDuzenle(kutu.dataset.id, metin.textContent, kutu));
  metin.addEventListener("blur", taslakYaz);
  kutu.appendChild(metin);

  const sil = document.createElement("button");
  sil.type = "button";
  sil.className = "rapor-sil";
  sil.title = "Bu maddeyi rapordan çıkar";
  sil.setAttribute("aria-label", "Maddeyi sil");
  sil.textContent = "🗑";
  sil.addEventListener("click", () => maddeSil(kutu.dataset.id));
  kutu.appendChild(sil);

  return kutu;
}

/* DOM'u madde madde günceller: yazarken imleç kaybolmasın diye
   o an düzenlenen maddeye dokunulmaz. */
function cizGuncelle({ liste: maddeler, cikan }) {
  const kapsayici = el("raporMaddeler");
  if (!kapsayici) return;
  const mevcut = new Map([...kapsayici.children].map((c) => [c.dataset.id, c]));
  const odak = document.activeElement;

  let onceki = null;
  maddeler.forEach((m) => {
    let dugum = mevcut.get(m.id);
    if (dugum) {
      mevcut.delete(m.id);
      const metinEl = dugum.querySelector(".rapor-metin");
      // Kullanıcı tam bu maddeyi yazıyorsa metnini ezmeyelim
      if (!dugum.contains(odak) && metinEl.textContent !== m.metin) {
        metinEl.textContent = m.metin;
      }
    } else {
      dugum = maddeOlustur(m);
    }
    dugum.className = "rapor-madde tur-" + m.tur + (m.elle ? " elle" : "");

    const olmasiGereken = onceki ? onceki.nextSibling : kapsayici.firstChild;
    if (dugum !== olmasiGereken && !dugum.contains(odak)) {
      kapsayici.insertBefore(dugum, olmasiGereken);
    }
    onceki = dugum;
  });

  mevcut.forEach((d) => { if (!d.contains(odak)) d.remove(); });
  bilgiYaz(cikan);
}

/* Rapor ekranı görünürken her veri değişiminde çağrılır */
export function raporEkraniniYenile() {
  cizGuncelle(maddeleriHesapla());
}

/* Bir kez çağrılır: taslağı yükler, butonları bağlar */
export function raporEkraniniKur(kancalar) {
  oturumVer = kancalar.oturumVer;
  taslakYukle();
  gorunumYukle();

  // Görünüm anahtarları: süreler ve olay günlüğü açık/kapalı
  [["raporSureToggle", "sure"], ["raporOlayToggle", "olay"]].forEach(([id, alan]) => {
    const kutu = el(id);
    if (!kutu) return;
    kutu.checked = gorunum[alan];
    kutu.addEventListener("change", () => {
      gorunum[alan] = kutu.checked;
      gorunumYaz();
      raporEkraniniYenile();
    });
  });

  el("raporYenidenBtn").addEventListener("click", () => {
    const elle = Object.keys(taslak.eller).length + taslak.serbest.length;
    const cikan = taslak.silinen.length;
    if ((elle || cikan) && !confirm(
      "Rapor verilerden baştan oluşturulacak.\n\n" +
      `Elle yazdığınız ${elle} madde ve çıkardığınız ${cikan} madde geri gelir. Devam edilsin mi?`
    )) return;
    taslak = { silinen: [], eller: {}, serbest: [] };
    taslakYaz();
    raporEkraniniYenile();
  });

  el("raporTumunuSilBtn").addEventListener("click", tumMaddeleriSil);

  el("raporMaddeEkleBtn").addEventListener("click", () => {
    const id = "serbest:" + Date.now().toString(36) + (sayac++).toString(36);
    taslak.serbest.push({ id, metin: "" });
    taslakYaz();
    raporEkraniniYenile();
    el("raporMaddeler").querySelector(`[data-id="${id}"] .rapor-metin`)?.focus();
  });

  el("raporPdfBtn").addEventListener("click", () => {
    taslakYaz();
    window.print();
  });
}
