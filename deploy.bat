@echo off
chcp 65001 > nul
title PIRUN Premier League - Firebase Deploy
color 0A

echo ====================================================
echo   🚀 PIRUN PREMIER LEAGUE - FIREBASE DEPLOY 🚀
echo ====================================================
echo.
echo 📌 กำลังเตรียมการ Deploy เว็บไซต์ขึ้น Firebase Hosting...
echo    🔥 Project: pl26-27
echo    📱 App ID:  1:404492465636:web:6ac34959cbc3fd873bc3f1
echo    🌐 URL:     https://pl26-27.web.app
echo.

call npx --yes firebase-tools deploy --only hosting --project pl26-27

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ จำเป็นต้องยืนยันสิทธิ์บัญชี Google ในครั้งแรก
    echo 🌐 กำลังเปิดหน้าต่างเบราว์เซอร์เพื่อล็อกอิน...
    echo.
    call npx --yes firebase-tools login
    echo.
    echo 🚀 กำลัง Deploy ไฟล์ขึ้น Hosting...
    echo.
    call npx --yes firebase-tools deploy --only hosting --project pl26-27
)

echo.
echo ====================================================
echo ✅ เสร็จสมบูรณ์! สามารถเข้าใช้งานเว็บไซต์ได้ที่:
echo    👉 https://pl26-27.web.app
echo    👉 https://pl26-27.firebaseapp.com
echo ====================================================
echo.
pause
