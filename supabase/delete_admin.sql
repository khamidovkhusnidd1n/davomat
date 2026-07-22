DELETE FROM public.users WHERE email LIKE '%admin%';
DELETE FROM auth.identities WHERE identity_data->>'email' LIKE '%admin%';
DELETE FROM auth.users WHERE email LIKE '%admin%';
