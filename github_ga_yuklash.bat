@echo off
echo ==============================================
echo DAVOMAD loyihasini GitHub'ga yuklash
echo ==============================================
echo.

:: Git initsializatsiyasi
if not exist ".git" (
    echo [1/5] Git yangidan sozlanmoqda...
    git init
) else (
    echo [1/5] Git allaqachon sozlangan.
)

:: Fayllarni qo'shish
echo [2/5] Fayllar git'ga qo'shilmoqda...
git add .

:: Commit qilish
echo [3/5] O'zgarishlar saqlanmoqda (commit)...
git commit -m "Birinchi versiya va APK builder"

:: Asosiy branch'ni main qilish
echo [4/5] Branch 'main' ga o'zgartirilmoqda...
git branch -M main

:: Remote origin'ni qo'shish
:: Xatolik bermasligi uchun avval o'chirib, keyin qo'shamiz
git remote remove origin 2>nul
git remote add origin https://github.com/khamidovkhusnidd1n/davomat.git

:: Push qilish
echo [5/5] GitHub'ga yuklanmoqda...
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ==============================================
    echo MUVAFFAQIYATLI YUKLANDI!
    echo ==============================================
    echo Endi GitHub'dagi Actions bo'limiga kirib APK tayyorlanishini kutishingiz mumkin.
) else (
    echo ==============================================
    echo XATOLIK YUZ BERDI!
    echo ==============================================
    echo Iltimos, yuqoridagi xatolikni tekshiring. (Internet yoki GitHub parolingizni so'rashi mumkin)
)
echo.
pause
