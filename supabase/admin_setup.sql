-- ============================================================================
-- 3-QADAM: Admin foydalanuvchini public.users ga qo'shish
-- Supabase Dashboard'da admin@app.local yaratganingizdan KEYIN run qiling
-- ============================================================================

INSERT INTO public.users (id, organization_id, full_name, email, phone, role)
SELECT
  id,
  '11111111-1111-1111-1111-111111111111',
  'Administrator',
  'admin@app.local',
  '+998 90 000 00 00',
  'admin'
FROM auth.users
WHERE email = 'admin@app.local';

-- Tekshirish
SELECT id, full_name, role FROM public.users;
