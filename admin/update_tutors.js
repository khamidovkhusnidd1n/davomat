const fs = require('fs');
const crypto = require('crypto');

const orgId = '11111111-1111-1111-1111-111111111111';

// Tutors to add
const tutors = [
  { id: crypto.randomUUID(), name: 'Otabek', email: 'otabek@app.local', pass: 'otabek12' },
  { id: crypto.randomUUID(), name: 'Guldona', email: 'guldona@app.local', pass: 'Guldona12' }
];

let sql = `\n-- Tutors (Mas'ul xodimlar)\n`;
for (const t of tutors) {
  sql += `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('${t.id}', '${t.email}', crypt('${t.pass}', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());\n`;
  sql += `INSERT INTO public.users (id, organization_id, full_name, email, role) VALUES ('${t.id}', '${orgId}', '${t.name}', '${t.email}', 'tutor');\n`;
}

// Update Admin password
// Foydalanuvchi qaysi parolga o'zgartirishni aytmagan bo'lsa, uni eslatamiz. 
// "admin pass ni opzgartirt" degandi, o'zgartiradigan SQL qo'shamiz:
sql += `\n-- Admin parolini yangilash (Xusniddin!123 ga)\n`;
sql += `UPDATE auth.users SET encrypted_password = crypt('Xusniddin!123', gen_salt('bf')) WHERE email = 'admin@itacademy.uz';\n`;

fs.writeFileSync('../supabase/add_tutors.sql', sql);
console.log('add_tutors.sql generated.');
