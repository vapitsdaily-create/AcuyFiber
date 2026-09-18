@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum tersedia.
  echo Instal Node.js atau buka index.html langsung di browser.
  pause
  exit /b 1
)
echo Menjalankan AcuyFiber. Buka http://localhost:3000 di browser.
echo Tekan Ctrl+C untuk berhenti.
node scripts\serve.mjs
pause
