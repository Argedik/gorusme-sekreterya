// ============================================================
//  FIREBASE AYARLARI
// ============================================================
//  Proje: gorusme-sekreterye — Realtime Database, europe-west1
//
//  Bu değerler GİZLİ DEĞİLDİR; web uygulamasına gömülmesi normaldir.
//  Güvenlik veritabanı kurallarıyla sağlanır: veriye yalnızca
//  Firebase Authentication ile giriş yapmış kullanıcılar erişebilir
//  (database.rules.json → "auth != null").
//
//  databaseURL bölgesel bir adres: europe-west1 veritabanları
//  "firebasedatabase.app" ile biter, "firebaseio.com" ile DEĞİL.
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyC_KtIa3Q3EmgcLAJqQr93wZcz2CNPRWqo",
  authDomain: "gorusme-sekreterye.firebaseapp.com",
  databaseURL: "https://gorusme-sekreterye-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gorusme-sekreterye",
  storageBucket: "gorusme-sekreterye.firebasestorage.app",
  messagingSenderId: "671334469119",
  appId: "1:671334469119:web:adf5fe89ac22a989872bca",
};
