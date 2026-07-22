-- Admin logini va parolini 'adminsys' qilib yaratish / yangilash
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'adminsys@app.local',
    crypt('adminsys', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now()
) ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email, 
    encrypted_password = EXCLUDED.encrypted_password;

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES (
    gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email',
    jsonb_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email', 'adminsys@app.local'), now(), now(), now()
) ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, organization_id, full_name, email, phone, role) 
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'System Admin',
    'adminsys@app.local',
    '+998 90 100 00 01',
    'admin'
) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
