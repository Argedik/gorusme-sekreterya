// ============================================================
//  Hazır liste — çizelgeden aktarılmış görüşme sırası.
//  Sekreterya ekranındaki "Hazır listeyi yükle" butonu bunu kullanır;
//  28 kişiyi elle girmek yerine tek dokunuşla listeye ekler.
//
//  Yeni bir çizelge geldiğinde yalnızca bu dosya değişir:
//  saatler "SS:DD" biçiminde, gruplar "not" alanında.
// ============================================================

export const HAZIR_LISTE_ADI = "Kübra başkan ekiple özel görüşmesi";

export const HAZIR_LISTE = [
  /* --- Özel görüşme (17.00 – 18.30) --- */
  { ad: "Meryem",       soyad: "Esen",       saat: "17:00", not: "" },
  { ad: "Sevgi",        soyad: "Öztürk",     saat: "17:10", not: "" },
  { ad: "Ecrin",        soyad: "Sönmez",     saat: "17:20", not: "" },
  { ad: "İclal",        soyad: "Aydın",      saat: "17:30", not: "" },
  { ad: "Hilal",        soyad: "Nergiz",     saat: "17:40", not: "" },
  { ad: "Ayşe Betül",   soyad: "Çetinkaya",  saat: "17:50", not: "" },
  { ad: "Elif Yğmur",   soyad: "Güneş",      saat: "18:00", not: "" },
  { ad: "Berayet",      soyad: "Kurtuluş",   saat: "18:10", not: "" },
  { ad: "Ayşe Ferhan",  soyad: "Sarıali",    saat: "18:20", not: "" },
  { ad: "İdal",         soyad: "Kılıçaslan", saat: "18:30", not: "" },

  /* --- Toplantı sonrası (20.00 – 20.50) --- */
  { ad: "Büşra",     soyad: "Argüç Kadiroğlu", saat: "20:00", not: "Toplantı sonrası" },
  { ad: "İlaydanur", soyad: "Demir",           saat: "20:10", not: "Toplantı sonrası" },
  { ad: "Elifnur",   soyad: "Bolat",           saat: "20:20", not: "Toplantı sonrası" },
  { ad: "Ayşegül",   soyad: "Baysal",          saat: "20:30", not: "Toplantı sonrası" },
  { ad: "Sümeyye",   soyad: "Aksoy",           saat: "20:40", not: "Toplantı sonrası" },
  { ad: "Başak",     soyad: "Öğütücü",         saat: "20:50", not: "Toplantı sonrası" },

  /* --- Çarşamba online (21.00 – 22.50) --- */
  { ad: "Sudenaz",     soyad: "Perçin",   saat: "21:00", not: "Çarşamba online" },
  { ad: "Azima",       soyad: "",         saat: "21:10", not: "Çarşamba online" },
  { ad: "Aysun",       soyad: "Mammadli", saat: "21:20", not: "Çarşamba online" },
  { ad: "Zeynep",      soyad: "Albayrak", saat: "21:30", not: "Çarşamba online" },
  { ad: "Hasret",      soyad: "Arslan",   saat: "21:40", not: "Çarşamba online" },
  { ad: "Nisanur",     soyad: "Gürgen",   saat: "21:50", not: "Çarşamba online" },
  { ad: "Şevval Sude", soyad: "İşler",    saat: "22:00", not: "Çarşamba online" },
  { ad: "Fatma Zehra", soyad: "Şenkaya",  saat: "22:10", not: "Çarşamba online" },
  { ad: "Hatice",      soyad: "Öner",     saat: "22:20", not: "Çarşamba online" },
  { ad: "Meral",       soyad: "Dağlılar", saat: "22:30", not: "Çarşamba online" },
  { ad: "Şevval",      soyad: "Tekin",    saat: "22:40", not: "Çarşamba online" },
  { ad: "Pakize İrem", soyad: "Metin",    saat: "22:50", not: "Çarşamba online" },
];
