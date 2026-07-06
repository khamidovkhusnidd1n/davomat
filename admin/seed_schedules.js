const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.join('=').trim();
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedSchedules() {
  const { data: groups } = await supabase.from('groups').select('id');
  if (!groups || groups.length === 0) return console.log("Guruhlar topilmadi.");

  const dayOfWeek = new Date().getDay() || 7; // getDay() returns 0 for Sunday, Flutter expects 1-7 (1=Mon, 7=Sun)
  // Let's just insert schedules for everyday (1 to 7) so they definitely show up
  
  let count = 0;
  for (const group of groups) {
    for (let day = 1; day <= 7; day++) {
      const times = [
        { start: '09:00', end: '10:20' },
        { start: '10:30', end: '11:50' },
        { start: '12:00', end: '13:20' }
      ];
      
      for (const time of times) {
        await supabase.from('schedules').insert({
          group_id: group.id,
          day_of_week: day,
          start_time: time.start,
          end_time: time.end
        });
        count++;
      }
    }
  }

  console.log(`✅ Jadvallar yaratildi! (Jami: ${count} ta yozuv)`);
}

seedSchedules();
