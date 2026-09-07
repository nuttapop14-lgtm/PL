@echo off
chcp 65001 > nul
title PIRUN Premier League 1-Click FPL Sync
color 0B

echo ====================================================
echo   ⚽ PIRUN PREMIER LEAGUE - 1-CLICK FPL SYNC ⚽
echo ====================================================
echo.
echo กำลังเริ่มดึงคะแนนสดจาก FPL API (League ID: 1576349)...
echo.

node "%~dp0sync_fpl.js"

echo.
echo ====================================================
echo กดปุ่มใดๆ เพื่อปิดหน้าต่างนี้...
pause > nul
