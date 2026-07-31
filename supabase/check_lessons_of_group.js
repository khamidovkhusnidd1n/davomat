const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  // Find Rangtasvir 14-guruh
  const { data: groups } = await supabase.from('groups').select('*').eq('name', 'Rangtasvir 14-guruh');
  console.log("Groups:", groups);
  if (!groups || groups.length === 0) return;

  const groupId = groups[0].id;

  // Find lessons for this group
  const { data: lessons } = await supabase
    .from('lessons')
    .select(`
      id,
      title,
      lesson_date,
      start_time,
      end_time,
      teacher_id,
      subject_id,
      teachers(full_name),
      subjects(name)
    `)
    .eq('group_id', groupId)
    .order('lesson_date');

  console.log("\nLessons for Rangtasvir 14-guruh:");
  lessons.forEach(l => {
    console.log(`- Date: ${l.lesson_date}, Time: ${l.start_time}-${l.end_time}, Title: ${l.title}`);
    console.log(`  Teacher: ${l.teachers?.full_name || '—'} (ID: ${l.teacher_id}), Subject: ${l.subjects?.name || '—'} (ID: ${l.subject_id})`);
  });

  // Find schedules for this group
  const { data: schedules } = await supabase
    .from('schedules')
    .select(`
      id,
      day_of_week,
      start_time,
      end_time,
      teacher_id,
      subject_id,
      teachers(full_name),
      subjects(name)
    `)
    .eq('group_id', groupId)
    .order('day_of_week');

  console.log("\nSchedules for Rangtasvir 14-guruh:");
  schedules.forEach(s => {
    console.log(`- Day: ${s.day_of_week}, Time: ${s.start_time}-${s.end_time}, Teacher: ${s.teachers?.full_name || '—'}, Subject: ${s.subjects?.name || '—'}`);
  });
}

run();
