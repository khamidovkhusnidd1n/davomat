-- 1. Barcha guruhlarni o'chirish (bu darslar, jadvallar va talabalarni cascade orqali o'chiradi)
DELETE FROM public.groups;

-- 2. Barcha foydalanuvchilarni o'chirish (faqat biz yaratgan toza adminsys'dan tashqari)
DELETE FROM public.users WHERE email != 'adminsys@app.local';

-- 3. Auth jadvallaridan o'chirish
DELETE FROM auth.identities WHERE identity_data->>'email' != 'adminsys@app.local';
DELETE FROM auth.users WHERE email != 'adminsys@app.local';
