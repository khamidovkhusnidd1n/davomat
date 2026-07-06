const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

// Env ni qo'lda o'qish (dotenv o'rnatilmagan bo'lsa ham ishlaydi)
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.join('=').trim();
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importAll() {
  const filePath = 'C:\\Users\\Salohiddin Markaz\\Downloads\\Davomat_import_tayyor.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  console.log(`Fayldan ${rows.length} ta qator o'qildi.`);

  // Tashkilotni olish
  const { data: orgs, error: orgErr } = await supabase.from('organizations').select('id').limit(1);
  if (orgErr || !orgs.length) {
    console.error("Tashkilot topilmadi");
    return;
  }
  const organizationId = orgs[0].id;
  console.log("Tashkilot ID:", organizationId);

  // Keshlar
  const teacherCache = {};
  const groupCache = {};
  let newLessonsCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const groupName = String(row['Guruh']).trim();
    const teacherName = String(row['Oqituvchi']).trim();
    const moduleName = String(row['Modul']).trim();
    let dateStr = row['Sana']; 
    const title = String(row['Mavzu']).trim() || `${row['Boshlanish']} darsi`;

    if (!groupName || !dateStr) continue;

    // Exceldagi Sana ba'zan raqam bo'lib qoladi
    if (typeof dateStr === 'number') {
      const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
      dateStr = dateObj.toISOString().split('T')[0];
    } else if (typeof dateStr === 'string' && dateStr.includes('.')) {
      // 13.03.2025 -> 2025-03-13
      const parts = dateStr.split('.');
      if (parts.length === 3) dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // 1. O'qituvchini qidirish yoki yaratish
    let teacherId = teacherCache[teacherName];
    if (!teacherId && teacherName) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('full_name', teacherName)
        .eq('role', 'teacher')
        .maybeSingle();

      if (existingUser) {
        teacherId = existingUser.id;
      } else {
        const email = `teacher_${Date.now()}_${Math.floor(Math.random()*1000)}@app.local`;
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email,
          password: 'password123',
          email_confirm: true
        });
        
        if (!authErr) {
          const newUserId = authData.user.id;
          const { error: userErr } = await supabase.from('users').insert({
            id: newUserId,
            organization_id: organizationId,
            full_name: teacherName,
            email,
            role: 'teacher'
          });

          if (!userErr) {
            teacherId = newUserId;
            console.log(`[+] Yangi o'qituvchi yaratildi: ${teacherName}`);
          }
        }
      }
      teacherCache[teacherName] = teacherId;
    }

    // 2. Guruhni qidirish yoki yaratish
    let groupId = groupCache[groupName];
    if (!groupId) {
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('name', groupName)
        .maybeSingle();

      if (existingGroup) {
        groupId = existingGroup.id;
      } else {
        const { data: newGroup, error: groupErr } = await supabase.from('groups').insert({
          organization_id: organizationId,
          name: groupName,
          course_name: moduleName || 'Umumiy',
          teacher_id: teacherId || null
        }).select('id').single();

        if (!groupErr) {
          groupId = newGroup.id;
          console.log(`[+] Yangi guruh yaratildi: ${groupName}`);
        }
      }
      groupCache[groupName] = groupId;
    }

    // 3. Darsni yaratish
    try {
      const { error: lessonErr } = await supabase.from('lessons').insert({
        group_id: groupId,
        lesson_date: dateStr,
        title: title
      });

      if (!lessonErr) {
        newLessonsCount++;
      }
    } catch (e) {}
  }

  console.log(`\n🎉 Import tugadi!`);
  console.log(`Bazada yangi darslar saqlandi: ${newLessonsCount}`);
}

importAll();
