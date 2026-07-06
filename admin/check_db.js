const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://uhbcnmcevcmpghwgsdsc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoYmNubWNldmNtcGdod2dzZHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkwNDU1NCwiZXhwIjoyMDk4NDgwNTU0fQ.Rw2sLtNI7kMUZTNgUuc7awG5YJltH0UTX_Y94T5bjFE';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoYmNubWNldmNtcGdod2dzZHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDQ1NTQsImV4cCI6MjA5ODQ4MDU1NH0.x-aLh0-qfzVde2qYUd4DM4o-Y5w7x2mridiYQTcaQsg';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkAndFix() {
  console.log('=== RLS TEKSHIRUV VA TUZATISH ===\n');

  // 1. Auth dagi barcha foydalanuvchilarni tekshirish
  const { data: { users: authUsers } } = await sb.auth.admin.listUsers({ perPage: 100 });
  
  // "shoma" ni topish
  const shomaAuth = authUsers.find(u => u.email && u.email.includes('shoma'));
  console.log('shoma auth:', shomaAuth ? `email=${shomaAuth.email}` : 'TOPILMADI');
  
  // "admin" login ni topish  
  const adminLoginAuth = authUsers.find(u => u.email === 'admin@app.local');
  console.log('admin@app.local auth:', adminLoginAuth ? `id=${adminLoginAuth.id}` : 'TOPILMADI');
  
  // xusniddin ni topish
  const xusniddinPub = await sb.from('users').select('id, email, full_name').ilike('full_name', '%xusniddin%').maybeSingle();
  if (xusniddinPub) {
    const xusniddinAuth = authUsers.find(u => u.id === xusniddinPub.id);
    console.log(`xusniddin: public_login="${xusniddinPub.email}", auth_email="${xusniddinAuth?.email}"`);
  }
  
  // student ni topish (full_name = "student")
  const studentPub = await sb.from('users').select('id, email, full_name, role').eq('full_name', 'student').maybeSingle();
  if (studentPub) {
    const studentAuth = authUsers.find(u => u.id === studentPub.id);
    console.log(`"student" user: public_login="${studentPub.email}", auth_email="${studentAuth?.email}", role=${studentPub.role}`);
  }

  // 2. Barcha auth emaillarni chiqarish
  console.log('\n--- Barcha auth users ---');
  for (const au of authUsers) {
    const pu = await sb.from('users').select('full_name, email, role').eq('id', au.id).maybeSingle();
    console.log(`  auth="${au.email}" | public_login="${pu?.email || 'YOQ'}" | name="${pu?.full_name || 'YOQ'}" | role=${pu?.role || 'YOQ'}`);
  }

  // 3. Anon client bilan login qilib tekshirish
  console.log('\n--- Login testlari ---');
  const sbAnon = createClient(SUPABASE_URL, ANON_KEY);
  
  const testLogins = [
    { email: 'admin@app.local', password: '123456' },
    { email: 'xamidov@app.local', password: '123456' },
  ];
  
  for (const tl of testLogins) {
    const { data, error } = await sbAnon.auth.signInWithPassword(tl);
    console.log(`  ${tl.email}: ${error ? '❌ ' + error.message : '✅ OK'}`);
    if (data?.session) await sbAnon.auth.signOut();
  }

  // 4. xamidov bilan kirib RLS testlari
  const { data: loginData, error: loginErr } = await sbAnon.auth.signInWithPassword({
    email: 'xamidov@app.local',
    password: '123456',
  });

  if (loginErr) {
    console.log('\n❌ xamidov bilan kirolmadim:', loginErr.message);
    return;
  }

  console.log('\n✅ xamidov bilan kirdim');

  // SELECT testlari
  const tables = ['schedules', 'lessons', 'attendance', 'students', 'users', 'groups'];
  for (const table of tables) {
    const { data, error } = await sbAnon.from(table).select('id').limit(1);
    console.log(`  SELECT ${table}: ${error ? '❌ ' + error.message : '✅ (' + (data?.length || 0) + ')'}`);
  }

  // INSERT test: lessons
  const chizma = (await sb.from('groups').select('id').eq('name', 'Chizma').single()).data;
  const { error: insErr } = await sbAnon.from('lessons').insert({
    group_id: chizma.id,
    lesson_date: '2099-01-01',
    title: 'TEST',
  });
  console.log(`  INSERT lessons: ${insErr ? '❌ ' + insErr.message : '✅ OK'}`);
  if (!insErr) {
    await sb.from('lessons').delete().eq('lesson_date', '2099-01-01');
  }

  // INSERT test: attendance
  const { error: attInsErr } = await sbAnon.from('attendance').insert({
    lesson_id: '00000000-0000-0000-0000-000000000000',
    student_id: '00000000-0000-0000-0000-000000000000',
    status: 'present',
  });
  console.log(`  INSERT attendance: ${attInsErr ? '❌ ' + attInsErr.message : '✅ OK'}`);

  await sbAnon.auth.signOut();
}

checkAndFix().catch(console.error);
