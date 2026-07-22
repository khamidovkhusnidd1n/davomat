-- Barcha eski admin yoki xato yaratilgan yozuvlarni tozalash
DELETE FROM public.users WHERE email LIKE '%admin%';
DELETE FROM auth.identities WHERE identity_data->>'email' LIKE '%admin%';
DELETE FROM auth.users WHERE email LIKE '%admin%';

-- Yangi admin yaratish (GoTrue to'liq tanishi uchun barcha maydonlar bilan)
INSERT INTO auth.users (
    id, 
    instance_id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    role, 
    aud, 
    created_at, 
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'adminsys@app.local',
    crypt('adminsys', gen_salt('bf')),
    now(), 
    'authenticated', 
    'authenticated', 
    now(), 
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false
);

INSERT INTO auth.identities (
    id, 
    user_id, 
    provider_id, 
    provider, 
    identity_data, 
    last_sign_in_at, 
    created_at, 
    updated_at
)
VALUES (
    gen_random_uuid(), 
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    'email',
    jsonb_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email', 'adminsys@app.local'), 
    now(), 
    now(), 
    now()
);

INSERT INTO public.users (id, organization_id, full_name, email, phone, role) 
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'System Admin',
    'adminsys@app.local',
    '+998 90 100 00 01',
    'admin'
);
