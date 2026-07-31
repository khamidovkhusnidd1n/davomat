const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking all schedules in database...");
  const { data, error } = await supabase
    .from('schedules')
    .select('id, group_id, day_of_week, start_time, end_time, teacher_id, subject_id, groups(name), teachers(full_name), subjects(name)');
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Total schedules:", data.length);
    data.forEach(s => {
      console.log(`ID: ${s.id}, Group: ${s.groups?.name}, Day: ${s.day_of_week}, Time: ${s.start_time}-${s.end_time}, Teacher: ${s.teachers?.full_name || 'NULL'}, Subject: ${s.subjects?.name || 'NULL'}`);
    });
  }
}

run();
