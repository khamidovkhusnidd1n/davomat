const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking Friday schedules in database...");
  const { data, error } = await supabase
    .from('schedules')
    .select('id, group_id, subject_id, start_time, end_time, day_of_week, subjects(name), groups(name, course_name)')
    .eq('day_of_week', 5);
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    data.forEach(s => {
      console.log(`ID: ${s.id}, Group: ${s.groups?.name}, Course: ${s.groups?.course_name}, Subject: ${s.subjects?.name}, Time: ${s.start_time}-${s.end_time}`);
    });
  }
}

run();
