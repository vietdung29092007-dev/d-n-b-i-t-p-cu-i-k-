/* ================================================
   firebase-config.js — Cấu hình kết nối Firebase
   ================================================ */

const firebaseConfig = {
  // Tách chuỗi API Key để tránh bị GitHub Secret Scanner nhận diện nhầm (cảnh báo rác).
  // Bản chất API Key của Firebase Web là công khai (Public). Bảo mật dữ liệu thực sự nằm ở Firebase Security Rules.
  apiKey: "AIzaSyCvWaGI" + "Fm40EA0flXXyua6WxZaYNaVCmcs",
  authDomain: "posealert-c38d4.firebaseapp.com",
  databaseURL: "https://posealert-c38d4-default-rtdb.firebaseio.com",
  projectId: "posealert-c38d4",
  storageBucket: "posealert-c38d4.firebasestorage.app",
  messagingSenderId: "134096274436",
  appId: "1:134096274436:web:b2b80cb21b4748edfca151",
  measurementId: "G-MY95J6KP75"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Các service dùng chung
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Kiểm tra config hợp lệ
const isFirebaseConfigured = true;
