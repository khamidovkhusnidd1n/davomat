const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: schedules } = await supabase.from('schedules').select('*');
  const { data: lessons } = await supabase.from('lessons').select('*').eq('lesson_date', '2026-08-07');
  
  console.log('Schedules:', schedules);
  console.log('Lessons Today:', lessons);
}
check();
