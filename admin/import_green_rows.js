require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const greenData = [
  // Abidjanova Feruza Abdullayevna
  { teacher: "Abidjanova Feruza Abdullayevna", subject: "San'at estetikasi", group: "Amaliy san'at (turlari bo'yicha)", nazariy: 6, amaliy: 0 },
  { teacher: "Abidjanova Feruza Abdullayevna", subject: "San'at estetikasi", group: "Dizayn (turlari bo'yicha)", nazariy: 6, amaliy: 0 },
  { teacher: "Abidjanova Feruza Abdullayevna", subject: "San'at estetikasi", group: "Potok (Amaliy san'at, Haykaltaroshlik, San'atshunoslik)", nazariy: 6, amaliy: 0 },
  { teacher: "Abidjanova Feruza Abdullayevna", subject: "San'at estetikasi", group: "Tasviriy san'at (turlari bo'yicha)", nazariy: 24, amaliy: 0 },

  // Akilova Kamola Boltabayevna
  { teacher: "Akilova Kamola Boltabayevna", subject: "San'at menejmenti va badiiy tahlil", group: "Potok (Amaliy san'at, Haykaltaroshlik, San'atshunoslik)", nazariy: 6, amaliy: 0 },
  { teacher: "Akilova Kamola Boltabayevna", subject: "San'at menejmenti", group: "San'atshunoslik", nazariy: 6, amaliy: 6 },

  // Alimkulova Dilzoda Rayimkulovna
  { teacher: "Alimkulova Dilzoda Rayimkulovna", subject: "San'at menejmenti va badiiy tahlil", group: "Amaliy san'at (turlari bo'yicha)", nazariy: 6, amaliy: 0 },
  { teacher: "Alimkulova Dilzoda Rayimkulovna", subject: "Jahon san'at tarixi", group: "San'atshunoslik", nazariy: 6, amaliy: 12 },
  { teacher: "Alimkulova Dilzoda Rayimkulovna", subject: "San'at menejmenti va badiiy tahlil", group: "Dizayn, gragika (turlari bo'yicha), san'atshunoslik", nazariy: 18, amaliy: 0 },
  { teacher: "Alimkulova Dilzoda Rayimkulovna", subject: "San'at menejmenti va badiiy tahlil", group: "Tasviriy san'at (turlari bo'yicha)", nazariy: 24, amaliy: 0 },
  { teacher: "Alimkulova Dilzoda Rayimkulovna", subject: "Tasviriy san'atda an'anaviy va zamonaviy uslublar", group: "Rangtasvir (turlari bo'yicha) (14-guruh 2-oy)", nazariy: 14, amaliy: 0 },
  { teacher: "Alimkulova Dilzoda Rayimkulovna", subject: "Tasviriy san'atda an'anaviy va zamonaviy uslublar", group: "Rangtasvir (turlari bo'yicha) (14-guruh 6-oy)", nazariy: 16, amaliy: 0 },

  // Alimov Nodir Yunusovich
  { teacher: "Alimov Nodir Yunusovich", subject: "Ta'lim-tarbiya jarayonini tashkil etishning normativ-huquqiy asoslari", group: "Amaliy san'at (turlari bo'yicha)", nazariy: 6, amaliy: 0 },
  { teacher: "Alimov Nodir Yunusovich", subject: "Ta'lim-tarbiya jarayonini tashkil etishning normativ-huquqiy asoslari", group: "Potok (Amaliy san'at, Haykaltaroshlik, San'atshunoslik)", nazariy: 6, amaliy: 0 },
  { teacher: "Alimov Nodir Yunusovich", subject: "Ta'lim-tarbiya jarayonini tashkil etishning normativ-huquqiy asoslari", group: "Grafika (turlari bo'yicha)", nazariy: 6, amaliy: 0 },
  { teacher: "Alimov Nodir Yunusovich", subject: "Ta'lim-tarbiya jarayonini tashkil etishning normativ-huquqiy asoslari", group: "Tasviriy san'at (turlari bo'yicha)", nazariy: 12, amaliy: 0 }
];

const crypto = require('crypto');

async function generateFakeEmail(name) {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${clean}@teacher.local`;
}

async function run() {
  console.log('Fetching existing data...');
  let { data: teachers } = await supabase.from('teachers').select('id, full_name, organization_id');
  let { data: groups } = await supabase.from('groups').select('id, name');
  let { data: subjects } = await supabase.from('subjects').select('id, name');

  let orgId = teachers && teachers.length > 0 ? teachers[0].organization_id : '11111111-1111-1111-1111-111111111111';
  let totalInsertedLessons = 0;
  let groupDayCounter = {};

  for (const row of greenData) {
    console.log(`Processing: ${row.teacher} - ${row.group}`);
    
    // 1. Resolve Teacher
    let teacher = teachers.find(u => u.full_name && u.full_name.toLowerCase() === row.teacher.toLowerCase());
    if (!teacher) {
      console.log(`Teacher not found: ${row.teacher}. Creating...`);
      
      const { data: newTeacher, error: uErr } = await supabase.from('teachers').insert({
        id: crypto.randomUUID(),
        organization_id: orgId,
        full_name: row.teacher
      }).select().single();
      
      if (uErr) {
        console.error("Error creating teacher:", uErr);
        continue;
      }
      teacher = newTeacher;
      teachers.push(teacher);
    }

    // 2. Resolve Group
    let group = groups.find(g => g.name.toLowerCase() === row.group.toLowerCase());
    if (!group) {
      console.log(`Group not found: ${row.group}. Creating...`);
      const { data: newGroup, error: gErr } = await supabase.from('groups').insert({ 
        name: row.group,
        organization_id: orgId,
        course_name: 'Qisqa muddatli' // or any default
      }).select().single();
      
      if (gErr) {
        console.error("Error creating group:", gErr);
        continue;
      }
      group = newGroup;
      groups.push(group);
    }

    // 3. Resolve Subject
    let subject = subjects.find(s => s.name.toLowerCase() === row.subject.toLowerCase());
    if (!subject) {
      console.log(`Subject not found: ${row.subject}. Creating...`);
      const { data: newSub, error: sErr } = await supabase.from('subjects').insert({ 
        name: row.subject,
        organization_id: orgId
      }).select().single();
      
      if (sErr) {
        console.error("Error creating subject:", sErr);
        continue;
      }
      subject = newSub;
      subjects.push(subject);
    }

    // 4. Ensure TeacherSubject link
    const { data: tsList } = await supabase.from('teacher_subjects')
      .select('id')
      .eq('teacher_id', teacher.id)
      .eq('subject_id', subject.id);
    
    let tsId = null;
    if (!tsList || tsList.length === 0) {
      const { data: newTs, error: tsErr } = await supabase.from('teacher_subjects').insert({
        teacher_id: teacher.id,
        subject_id: subject.id,
        total_hours: 100 // baseline
      }).select().single();
      if (!tsErr) tsId = newTs.id;
    } else {
      tsId = tsList[0].id;
    }

    // 5. Create fake lessons
    let currentNazariy = row.nazariy;
    let currentAmaliy = row.amaliy;
    
    // Use the global map instead of local dayCounter
    if (!groupDayCounter[group.id]) {
      groupDayCounter[group.id] = 1; // start from Jan 1
    }
    
    const insertLessons = async (total, type) => {
      let remaining = total;
      while (remaining > 0) {
        let chunk = Math.min(2, remaining);
        
        let dayCounter = groupDayCounter[group.id];
        // Ensure day is 2 digits and avoid going over 31
        let dayStr = String(dayCounter % 28 + 1).padStart(2, '0');
        let monthStr = String(Math.floor(dayCounter / 28) + 1).padStart(2, '0');
        
        const { error } = await supabase.from('lessons').insert({
          group_id: group.id,
          subject_id: subject.id,
          teacher_id: teacher.id,
          lesson_date: `2026-${monthStr}-${dayStr}`,
          start_time: '09:00',
          end_time: chunk === 2 ? '10:20' : '09:40',
          lesson_type: type
        });
        
        if (error) {
           // Skip logging unique constraint to avoid noise
           if (error.code !== '23505') console.error("Error inserting lesson:", error);
           // Do not decrement remaining, let it retry on the next day
        } else {
           totalInsertedLessons++;
           remaining -= chunk;
        }
        groupDayCounter[group.id]++;
      }
    };

    if (currentNazariy > 0) await insertLessons(currentNazariy, 'theory');
    if (currentAmaliy > 0) await insertLessons(currentAmaliy, 'practice');

    console.log(`  -> Inserted ${row.nazariy} nazariy, ${row.amaliy} amaliy for ${row.group}`);
  }

  console.log(`DONE! Total fake lessons inserted: ${totalInsertedLessons}`);
}

run().catch(console.error);
