const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Env o'qish
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.join('=').trim();
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Yordamchi funksiya: User yaratish
async function createUser(orgId, fullName, loginStr, passwordStr, role) {
  const email = `${loginStr}@app.local`;
  
  // Create in Auth
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: email,
    password: passwordStr,
    email_confirm: true,
  });

  if (authErr) {
    if (authErr.message.includes('already exists')) {
      // User mavjud bo'lsa topamiz
      const { data } = await supabase.from('users').select('id').eq('email', loginStr).single();
      return data ? data.id : null;
    }
    console.error(`Error creating auth user ${loginStr}:`, authErr.message);
    return null;
  }

  const userId = authData.user.id;
  
  // Create in public.users
  const { error: userErr } = await supabase.from('users').insert({
    id: userId,
    organization_id: orgId,
    full_name: fullName,
    email: loginStr,
    role: role
  });

  if (userErr) {
    console.error(`Error inserting public.user ${loginStr}:`, userErr.message);
    return null;
  }
  
  return userId;
}

async function seed() {
  console.log("Test ma'lumotlarini yaratish boshlandi...");

  // 1. Tashkilot ID olish
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs || orgs.length === 0) {
    console.error("Tashkilot topilmadi!");
    return;
  }
  const orgId = orgs[0].id;

  // 2. O'qituvchilarni yaratish
  const t1 = await createUser(orgId, "Alisher Alimov", "tutor1", "tutor1", "teacher");
  const t2 = await createUser(orgId, "Botir Botirov", "tutor2", "tutor2", "teacher");
  const t3 = await createUser(orgId, "Sardor Sardorov", "tutor3", "tutor3", "teacher");
  
  if (!t1 || !t2 || !t3) return console.error("O'qituvchilarni yaratishda xatolik");
  console.log("✅ 3 ta o'qituvchi yaratildi (tutor1, tutor2, tutor3)");

  // 3. Guruhlarni yaratish
  const groupsData = [
    { name: "Frontend-1", course_name: "Frontend dasturlash", tutor_id: t1 },
    { name: "Backend-1", course_name: "Backend dasturlash", tutor_id: t2 },
    { name: "Design-1", course_name: "Grafik dizayn", tutor_id: t3 }
  ];

  const createdGroups = [];
  for (const g of groupsData) {
    const { data: grp, error: err } = await supabase.from('groups').insert({
      organization_id: orgId,
      name: g.name,
      course_name: g.course_name,
      tutor_id: g.tutor_id, // "teacher_id" emas, tutor_id ga biriktiramiz shunda "tutors" panelda chiqadi
    }).select('id').single();
    if (err) console.error("Group insert err", err);
    else createdGroups.push(grp.id);
  }
  console.log("✅ 3 ta guruh yaratildi");

  // 4. O'quvchilar va Sinf Sardorlarini yaratish
  // Har guruhga 1 ta monitor va 2 ta student
  const studentsConfig = [
    { groupIdx: 0, login: "student1", name: "Aziz (Sardor)", role: "monitor" },
    { groupIdx: 0, login: "s1_a", name: "Olim", role: "student" },
    { groupIdx: 0, login: "s1_b", name: "Javlon", role: "student" },

    { groupIdx: 1, login: "student2", name: "Bekzod (Sardor)", role: "monitor" },
    { groupIdx: 1, login: "s2_a", name: "Anvar", role: "student" },
    { groupIdx: 1, login: "s2_b", name: "Samandar", role: "student" },

    { groupIdx: 2, login: "student3", name: "Javohir (Sardor)", role: "monitor" },
    { groupIdx: 2, login: "s3_a", name: "Temur", role: "student" },
    { groupIdx: 2, login: "s3_b", name: "Sherzod", role: "student" },
  ];

  for (const st of studentsConfig) {
    const sId = await createUser(orgId, st.name, st.login, st.login, st.role);
    if (sId) {
      await supabase.from('students').insert({
        user_id: sId,
        group_id: createdGroups[st.groupIdx],
        status: 'active'
      });
    }
  }
  console.log("✅ 9 ta o'quvchi yaratildi (shu jumladan 3 ta monitor: student1, student2, student3)");

  // 5. Darslarni (Lessons) qo'shish
  // Har bir guruh uchun bugun 3 ta dars (3 para) yaratamiz
  const today = new Date().toISOString().split('T')[0];
  let lessonCount = 0;

  for (let i = 0; i < createdGroups.length; i++) {
    const groupId = createdGroups[i];
    const groupName = groupsData[i].name;
    
    for (let para = 1; para <= 3; para++) {
      await supabase.from('lessons').insert({
        group_id: groupId,
        lesson_date: today,
        title: `${groupName} - ${para}-para darsi`
      });
      lessonCount++;
    }
  }

  console.log(`✅ Har bir guruh uchun 3 tadan dars yaratildi (Jami: ${lessonCount} dars)`);
  console.log("🎉 Barcha test ma'lumotlari tayyor!");
}

seed();
