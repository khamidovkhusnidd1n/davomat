const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

const supabase = createClient(
  'https://uhbcnmcevcmpghwgsdsc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoYmNubWNldmNtcGdod2dzZHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkwNDU1NCwiZXhwIjoyMDk4NDgwNTU0fQ.Rw2sLtNI7kMUZTNgUuc7awG5YJltH0UTX_Y94T5bjFE',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const orgId = '11111111-1111-1111-1111-111111111111';

async function importAll() {
  console.log('Starting FINAL import process...');

  const teachers = [
    { name: 'Alimov Umid', email: 'alimov@itacademy.uz', pass: 'Teacher123!', course: 'Rangtasvir', date: '2026-07-20' },
    { name: 'Sultanov Shavkat', email: 'sultanov@itacademy.uz', pass: 'Teacher123!', course: 'Art marketing', date: '2026-07-21' },
    { name: 'Qiyomov Zuhriddin', email: 'qiyomov@itacademy.uz', pass: 'Teacher123!', course: 'Chizmatasvir', date: '2026-07-22' },
    { name: 'Lashyanov Timur', email: 'lashyanov@itacademy.uz', pass: 'Teacher123!', course: 'Kompozitsiya', date: '2026-07-23' }
  ];

  const tutors = [
    { name: 'Otabek', email: 'otabek@app.local', pass: 'otabek12' },
    { name: 'Guldona', email: 'guldona@app.local', pass: 'Guldona12' }
  ];

  // Create teachers
  for (const t of teachers) {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: t.email,
      password: t.pass,
      email_confirm: true,
      user_metadata: { name: t.name }
    });
    if (authErr) { console.error('Teacher create error:', t.email, authErr.message); continue; }
    t.id = authData.user.id;
    await supabase.from('users').insert({
      id: t.id,
      organization_id: orgId,
      full_name: t.name,
      email: t.email,
      role: 'teacher'
    });
    console.log('Created teacher:', t.name);
  }

  // Create tutors
  for (const t of tutors) {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: t.email,
      password: t.pass,
      email_confirm: true,
      user_metadata: { name: t.name }
    });
    if (authErr) { console.error('Tutor create error:', t.email, authErr.message); continue; }
    t.id = authData.user.id;
    await supabase.from('users').insert({
      id: t.id,
      organization_id: orgId,
      full_name: t.name,
      email: t.email,
      role: 'tutor'
    });
    console.log('Created tutor:', t.name);
  }

  // Create group
  const { data: groupData } = await supabase.from('groups').insert({
    organization_id: orgId,
    name: 'Rangtasvir 14-guruh',
    course_name: 'Rangtasvir malaka oshirish'
  }).select().single();
  const groupId = groupData?.id;
  console.log('Created group:', groupId);

  // Read excel
  const wb = xlsx.readFile('C:\\Users\\Salohiddin Markaz\\Downloads\\Telegram Desktop\\Rangtasvir guruh davomat 14.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws);
  const validStudents = rows.filter(r => r['__EMPTY'] && r['__EMPTY'] !== 'FISH' && typeof r['__EMPTY'] === 'string');

  const studentsToCreate = validStudents.slice(0, 30); // ONLY FIRST 30 STUDENTS

  console.log(`Found ${validStudents.length} students. Creating ONLY FIRST ${studentsToCreate.length}...`);

  // Create students
  for (let i = 0; i < studentsToCreate.length; i++) {
    const row = studentsToCreate[i];
    const fullName = row['__EMPTY'].trim();
    const phone = row['__EMPTY_15'] ? String(row['__EMPTY_15']).replace(/\s/g, '') : '';
    const email = `student${i+1}@app.local`;

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email,
      password: 'Student123!',
      email_confirm: true,
      user_metadata: { name: fullName }
    });
    if (authErr) { console.error('Student auth err:', email, authErr.message); continue; }
    
    const userId = authData.user.id;
    await supabase.from('users').insert({
      id: userId,
      organization_id: orgId,
      full_name: fullName,
      email: email,
      phone: phone,
      role: 'student'
    });

    await supabase.from('students').insert({
      user_id: userId,
      group_id: groupId,
      status: 'active'
    });

    console.log(`Inserted student ${i+1}: ${fullName}`);
  }

  // Create lessons
  for (const t of teachers) {
    if (t.id) {
      await supabase.from('lessons').insert({
        group_id: groupId,
        title: t.course,
        lesson_date: t.date,
        created_by: t.id
      });
    }
  }
  
  // Create schedule
  await supabase.from('schedules').insert([
    { group_id: groupId, day_of_week: 1, start_time: '14:00', end_time: '18:00', room_number: '1', teacher_id: teachers[0]?.id },
    { group_id: groupId, day_of_week: 2, start_time: '09:00', end_time: '13:00', room_number: '1', teacher_id: teachers[1]?.id },
    { group_id: groupId, day_of_week: 3, start_time: '09:00', end_time: '13:00', room_number: '1', teacher_id: teachers[2]?.id },
    { group_id: groupId, day_of_week: 4, start_time: '09:00', end_time: '13:00', room_number: '1', teacher_id: teachers[3]?.id }
  ]);

  console.log('FINAL Import completed successfully!');
}

importAll().catch(console.error);
