// ============================================================
//  FIREBASE AYARLARI
// ============================================================
//  Ayrı cihazlar arasında CANLI senkron için buraya kendi
//  Firebase projenizin bilgilerini yapıştırın.
//
//  Nasıl alınır? README.md dosyasındaki adımlara bakın.
//  (apiKey gibi değerler "gizli" değildir; web uygulamasına
//   gömülmesi normaldir — güvenlik, veritabanı kurallarıyla sağlanır.)
//
//  ⚠️  Buradaki değerleri değiştirmezseniz site "yerel deneme
//      modunda" çalışır: aynı bilgisayarda açık sekmeler senkron
//      olur, ama FARKLI cihazlar birbirini GÖRMEZ.
// ============================================================

export const firebaseConfig = {
  apiKey: "BURAYA_API_KEY",
  authDomain: "BURAYA_PROJE.firebaseapp.com",
  databaseURL: "https://BURAYA_PROJE-default-rtdb.firebaseio.com",
  projectId: "BURAYA_PROJE",
  storageBucket: "BURAYA_PROJE.appspot.com",
  messagingSenderId: "BURAYA_SENDER_ID",
  appId: "BURAYA_APP_ID",
};
