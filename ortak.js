// ============================================================
//  Ortak küçük yardımcılar — app.js ve rapor.js birlikte kullanır.
// ============================================================

export function tamAd(k) {
  if (!k) return "—";
  return [k.ad, k.soyad].filter(Boolean).join(" ") || "(isimsiz)";
}

/* Geçen süreyi mm:ss (uzunsa sa:dk:sn) biçiminde yazar — ekrandaki etiketler için */
export function sureBicimle(ms) {
  const sn = Math.max(0, Math.floor(ms / 1000));
  const dk = Math.floor(sn / 60);
  const kalan = sn % 60;
  if (dk >= 60) {
    const sa = Math.floor(dk / 60);
    return `${sa}:${String(dk % 60).padStart(2, "0")}:${String(kalan).padStart(2, "0")}`;
  }
  return `${String(dk).padStart(2, "0")}:${String(kalan).padStart(2, "0")}`;
}

/* Aynı süre, raporda okunacak biçimde: "1 sa 12 dk", "12 dk 30 sn", "40 sn" */
export function sureYaz(ms) {
  const sn = Math.max(0, Math.round(ms / 1000));
  const sa = Math.floor(sn / 3600);
  const dk = Math.floor((sn % 3600) / 60);
  const kalanSn = sn % 60;
  if (sa) return `${sa} sa ${dk} dk`;
  if (dk) return kalanSn ? `${dk} dk ${kalanSn} sn` : `${dk} dk`;
  return `${kalanSn} sn`;
}

/* Zaman damgasından saat: 1738000000000 → "17:04" */
export function saatYaz(t) {
  if (!t) return "—";
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* Zaman damgasından tam tarih: "27 Temmuz 2026, Pazartesi" */
export function tarihYaz(t) {
  return new Date(t).toLocaleDateString("tr-TR", {
    day: "numeric", month: "long", year: "numeric", weekday: "long",
  });
}

/* ------------------------------------------------------------
   Kişinin planlanan tarihi ("YYYY-MM-DD", input type=date biçimi).
   Liste birden fazla günü karıştırdığı için (Çarşamba grubu + Perşembe
   grubu aynı tabloda) saatin yanında hangi gün olduğu da yazıyor.
   ------------------------------------------------------------ */

const GUN_KISA = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

/* "YYYY-MM-DD" → Date (yerel saat; yeni Date("2026-07-29") UTC sayardı) */
function isoTariheCevir(iso) {
  const [y, a, g] = String(iso || "").split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(a) || !Number.isFinite(g)) return null;
  const d = new Date(y, a - 1, g);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* Tabloda/kartta: "Çar 29.07" — kısa, sütunu şişirmez */
export function tarihKisaYaz(iso) {
  const d = isoTariheCevir(iso);
  if (!d) return "";
  const gun = String(d.getDate()).padStart(2, "0");
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  return `${GUN_KISA[d.getDay()]} ${gun}.${ay}`;
}

/* Raporda: "29.07.2026 Çarşamba" */
export function tarihUzunYaz(iso) {
  const d = isoTariheCevir(iso);
  if (!d) return "";
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", weekday: "long",
  });
}

/* Tarih + saati tek satırda birleştirir: "Çar 29.07 · 21:00" */
export function tarihSaatYaz(iso, saat) {
  return [tarihKisaYaz(iso), saat || ""].filter(Boolean).join(" · ");
}
