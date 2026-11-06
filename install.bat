@echo off
chcp 65001 >nul
title URY Desktop - Build Installer
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js غير مثبت. حمّله من https://nodejs.org ^(نسخة LTS^) ثم أعد تشغيل هذا الملف.
  pause
  exit /b 1
)

echo [1/3] تثبيت المكتبات...
call npm install
if errorlevel 1 goto :fail

echo [2/3] بناء المثبّت...
call npm run dist
if errorlevel 1 goto :fail

echo [3/3] تم. سيُفتح مجلد dist - شغّل ملف Setup لتثبيت البرنامج.
start "" "%~dp0dist"
pause
exit /b 0

:fail
echo [!] فشلت العملية. تأكد من اتصال الإنترنت وأعد المحاولة.
pause
exit /b 1
