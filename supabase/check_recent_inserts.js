const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking for ANY attendance records inserted on or after July 31, 2026 Tashkent time...");
  const { data, error } = await supabase
    .from('attendance')
    .select('id, status, created_at, lesson_id, marked_by, lessons(id, lesson_date, title, groups(name))')
    .gte('created_at', '2026-07-31T00:00:00+05:00');
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Records inserted today:", data.length);
    data.forEach(a => {
      console.log(`ID: ${a.id}, Status: ${a.status}, CreatedAt: ${a.created_at}, LessonDate: ${a.lessons?.lesson_date}, LessonTitle: ${a.lessons?.title}, Group: ${a.lessons?.groups?.name}`);
    });
  }
}

run();
