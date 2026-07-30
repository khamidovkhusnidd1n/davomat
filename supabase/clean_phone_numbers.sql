-- Bazadagi barcha foydalanuvchilarning telefon raqamlaridan bo'shliqlarni olib tashlab, standartlashtirish
UPDATE public.users 
SET phone = REPLACE(phone, ' ', '') 
WHERE phone IS NOT NULL;
