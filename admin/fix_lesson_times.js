const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixLessons() {
  // Get all lessons where start_time or end_time is null but title has time info
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, title, start_time, end_time')
    .or('start_time.is.null,end_time.is.null');

  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  console.log(`Found ${lessons.length} lessons with null times`);

  let fixed = 0;
  for (const lesson of lessons) {
    if (!lesson.title) continue;
    
    // Title format: "09:00-10:20 | Rangtasvir"
    const parts = lesson.title.split(' | ');
    if (!parts[0] || !parts[0].includes('-')) continue;
    
    const times = parts[0].split('-');
    const startTime = times[0]?.trim();
    const endTime = times[1]?.trim();
    
    // Validate HH:MM format
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) continue;

    const start = startTime.length === 5 ? `${startTime}:00` : startTime;
    const end = endTime.length === 5 ? `${endTime}:00` : endTime;

    const { error: updateErr } = await supabase
      .from('lessons')
      .update({ start_time: start, end_time: end })
      .eq('id', lesson.id);

    if (updateErr) {
      console.error(`Error updating ${lesson.id}:`, updateErr.message);
    } else {
      fixed++;
      console.log(`Fixed: ${lesson.title} → ${start} - ${end}`);
    }
  }

  console.log(`\nDone! Fixed ${fixed}/${lessons.length} lessons.`);
}

fixLessons();
