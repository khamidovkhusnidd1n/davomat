
-- Tutors (Mas'ul xodimlar)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('5c301f6e-9c70-4495-a4a1-9fd556eec0d6', 'otabek@app.local', crypt('otabek12', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, role) VALUES ('5c301f6e-9c70-4495-a4a1-9fd556eec0d6', '11111111-1111-1111-1111-111111111111', 'Otabek', 'otabek@app.local', 'tutor');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('c86de69e-466f-4f76-860f-15719402d271', 'guldona@app.local', crypt('Guldona12', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, role) VALUES ('c86de69e-466f-4f76-860f-15719402d271', '11111111-1111-1111-1111-111111111111', 'Guldona', 'guldona@app.local', 'tutor');

-- Admin parolini yangilash (Xusniddin!123 ga)
UPDATE auth.users SET encrypted_password = crypt('Xusniddin!123', gen_salt('bf')) WHERE email = 'admin@itacademy.uz';
