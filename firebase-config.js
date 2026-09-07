/**
 * PIRUN Premier League 2026-2027
 * Firebase Configuration File
 * Project: pl26-27
 */

const firebaseConfig = {
  apiKey: "AIzaSyADMUIZQ_ghSxpRz5bic4A-XZSEbEwxzC8",
  authDomain: "pl26-27.firebaseapp.com",
  databaseURL: "https://pl26-27-default-rtdb.firebaseio.com",
  projectId: "pl26-27",
  storageBucket: "pl26-27.firebasestorage.app",
  messagingSenderId: "404492465636",
  appId: "1:404492465636:web:6ac34959cbc3fd873bc3f1",
  measurementId: "G-HFBF4CEQ3X"
};

// ตรวจสอบสถานะการเชื่อมต่อ
window.isFirebaseReady = function() {
  return typeof firebase !== 'undefined' && 
         firebaseConfig.apiKey && 
         firebaseConfig.apiKey !== "YOUR_API_KEY";
};
