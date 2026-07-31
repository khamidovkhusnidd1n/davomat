const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

const orgId = '11111111-1111-1111-1111-111111111111';
const groupId = '04dec599-22aa-437c-b2dc-41e6b1256dbf'; // Rangtasvir 14-guruh

async function getOrCreateTeacher(name) {
  const { data: existing } = await supabase
    .from('teachers')
    .select('id')
    .eq('organization_id', orgId)
    .ilike('full_name', name)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: inserted, error } = await supabase
    .from('teachers')
    .insert({
      organization_id: orgId,
      full_name: name,
      education_type: 'qayta_tayyorlov'
    })
    .select('id')
    .single();

  if (error) throw error;
  console.log(`Created teacher: ${name}`);
  return inserted.id;
}

async function getOrCreateSubject(name) {
  const { data: existing } = await supabase
    .from('subjects')
    .select('id')
    .eq('organization_id', orgId)
    .ilike('name', name)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: inserted, error } = await supabase
    .from('subjects')
    .insert({
      organization_id: orgId,
      name: name
    })
    .select('id')
    .single();

  if (error) throw error;
  console.log(`Created subject: ${name}`);
  return inserted.id;
}

async function run() {
  try {
    // 1. Get/Create teachers
    const qiyomovId = await getOrCreateTeacher('Qiyomov Zuhriddin');
    const alimovId = await getOrCreateTeacher('Alimov Umid');
    const lashyanovId = await getOrCreateTeacher('Lashyanov Temur');
    const isroilovaId = await getOrCreateTeacher('Isroilova Munisa');

    // 2. Get/Create subjects
    const chizmatasvirId = await getOrCreateSubject('Chizmatasvir');
    const rangtasvirId = await getOrCreateSubject('Rangtasvir');
    const kompozitsiyaId = await getOrCreateSubject('Kompozitsiya');
    const matId = await getOrCreateSubject('Materialshunoslik va rangtasvir texnikasi');

    // Define weekday mapping (Day 1 = Dushanba, etc.)
    const weekdayMap = {
      1: { teacher_id: qiyomovId, subject_id: chizmatasvirId, name: 'Dushanba' },
      2: { teacher_id: alimovId, subject_id: rangtasvirId, name: 'Seshanba' },
      3: { teacher_id: lashyanovId, subject_id: kompozitsiyaId, name: 'Chorshanba' },
      4: { teacher_id: isroilovaId, subject_id: matId, name: 'Payshanba' },
      5: { teacher_id: alimovId, subject_id: rangtasvirId, name: 'Juma' },
      6: { teacher_id: qiyomovId, subject_id: chizmatasvirId, name: 'Shanba' }
    };

    console.log("\nUpdating schedules table...");
    for (const [dayStr, map] of Object.entries(weekdayMap)) {
      const day = parseInt(dayStr);
      const { data, error } = await supabase
        .from('schedules')
        .update({
          teacher_id: map.teacher_id,
          subject_id: map.subject_id
        })
        .eq('group_id', groupId)
        .eq('day_of_week', day)
        .select('*');

      if (error) {
        console.error(`Error updating schedule for ${map.name}:`, error);
      } else {
        console.log(`Updated schedule for ${map.name}: linked to teacher and subject. Row count:`, data.length);
      }
    }

    console.log("\nUpdating existing lessons table for Rangtasvir 14-guruh...");
    // Find all lessons of this group
    const { data: lessons, error: lesErr } = await supabase
      .from('lessons')
      .select('id, lesson_date, title')
      .eq('group_id', groupId);

    if (lesErr) throw lesErr;

    for (const lesson of lessons) {
      const date = new Date(lesson.lesson_date);
      // getDay() returns 0 for Sunday, 1 for Monday, etc.
      let dayOfWeek = date.getDay();
      if (dayOfWeek === 0) continue; // Skip Sundays

      const mapping = weekdayMap[dayOfWeek];
      if (mapping) {
        const { error: updErr } = await supabase
          .from('lessons')
          .update({
            teacher_id: mapping.teacher_id,
            subject_id: mapping.subject_id
          })
          .eq('id', lesson.id);

        if (updErr) {
          console.error(`Error updating lesson for date ${lesson.lesson_date}:`, updErr);
        } else {
          console.log(`Updated lesson on ${lesson.lesson_date} (${lesson.title}) -> linked to ${mapping.teacher_id} & ${mapping.subject_id}`);
        }
      }
    }

    console.log("\nAll schedules and lessons updated successfully!");
  } catch (err) {
    console.error("Execution error:", err);
  }
}

run();
