-- Admin login va parolini yangilash
UPDATE auth.users 
SET email = 'adminsys@app.local', 
    encrypted_password = crypt('adminsys', gen_salt('bf')) 
WHERE email IN ('admin@itacademy.uz', 'admin@app.local', 'sysadmin@app.local', 'adminsys@app.local');

UPDATE public.users 
SET email = 'adminsys@app.local' 
WHERE email IN ('admin@itacademy.uz', 'admin@app.local', 'sysadmin@app.local', 'adminsys@app.local');
