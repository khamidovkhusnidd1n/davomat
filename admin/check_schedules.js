const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchedules() {
  const { data: schedules } = await supabase.from('schedules').select('*');
  const { data: lessons } = await supabase.from('lessons').select('schedule_id, lesson_date');

  let schedulesWithoutLessons = 0;
  for (const sch of schedules) {
    const hasLessons = lessons.some(l => l.schedule_id === sch.id && new Date(l.lesson_date) > new Date());
    if (!hasLessons) schedulesWithoutLessons++;
  }

  console.log(`Total schedules: ${schedules.length}`);
  console.log(`Schedules without future lessons: ${schedulesWithoutLessons}`);
}

checkSchedules();
