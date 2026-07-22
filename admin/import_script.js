const xlsx = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');

const wb = xlsx.readFile('C:\\Users\\Salohiddin Markaz\\Downloads\\Telegram Desktop\\Rangtasvir guruh davomat 14.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws);

const orgId = '11111111-1111-1111-1111-111111111111';
const groupId = crypto.randomUUID();

let sql = `-- Rangtasvir guruhini kiritish\n\n`;

// Insert group
sql += `INSERT INTO public.groups (id, organization_id, name, course_name) VALUES ('${groupId}', '${orgId}', 'Rangtasvir 14-guruh', 'Rangtasvir malaka oshirish');\n\n`;

// Teachers
const teachers = [
  { id: crypto.randomUUID(), name: 'Alimov Umid', email: 'alimov@itacademy.uz', course: 'Rangtasvir' },
  { id: crypto.randomUUID(), name: 'Sultanov Shavkat', email: 'sultanov@itacademy.uz', course: 'Art marketing' },
  { id: crypto.randomUUID(), name: 'Qiyomov Zuhriddin', email: 'qiyomov@itacademy.uz', course: 'Chizmatasvir' },
  { id: crypto.randomUUID(), name: 'Lashyanov Timur', email: 'lashyanov@itacademy.uz', course: 'Kompozitsiya' }
];

for (const t of teachers) {
  sql += `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('${t.id}', '${t.email}', crypt('Teacher123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());\n`;
  sql += `INSERT INTO public.users (id, organization_id, full_name, email, role) VALUES ('${t.id}', '${orgId}', '${t.name}', '${t.email}', 'teacher');\n`;
}

// Lessons
sql += `\n-- Lessons\n`;
sql += `INSERT INTO public.lessons (id, group_id, title, lesson_date, created_by) VALUES \n`;
sql += `  ('${crypto.randomUUID()}', '${groupId}', 'Rangtasvir', '2026-07-20', '${teachers[0].id}'),\n`;
sql += `  ('${crypto.randomUUID()}', '${groupId}', 'Art marketing', '2026-07-21', '${teachers[1].id}'),\n`;
sql += `  ('${crypto.randomUUID()}', '${groupId}', 'Chizmatasvir', '2026-07-22', '${teachers[2].id}'),\n`;
sql += `  ('${crypto.randomUUID()}', '${groupId}', 'Kompozitsiya', '2026-07-23', '${teachers[3].id}');\n\n`;

// Students
sql += `-- Students\n`;

let validStudents = rows.filter(r => r['__EMPTY'] && r['__EMPTY'] !== 'FISH' && typeof r['__EMPTY'] === 'string');

for (let i = 0; i < validStudents.length; i++) {
  const row = validStudents[i];
  const fullName = row['__EMPTY'].trim().replace(/'/g, "''");
  const phone = row['__EMPTY_15'] ? String(row['__EMPTY_15']).replace(/\s/g, '').replace(/'/g, "''") : '';
  const email = `student${i+1}@app.local`;
  const userId = crypto.randomUUID();
  const studentId = crypto.randomUUID();

  sql += `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('${userId}', '${email}', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());\n`;
  sql += `INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('${userId}', '${orgId}', '${fullName}', '${email}', '${phone}', 'student');\n`;
  sql += `INSERT INTO public.students (id, user_id, group_id, status) VALUES ('${studentId}', '${userId}', '${groupId}', 'active');\n`;
}

fs.writeFileSync('../supabase/insert_rangtasvir.sql', sql);
console.log(`Generated insert_rangtasvir.sql with ${validStudents.length} students.`);
