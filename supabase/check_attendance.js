const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking lessons created for July 30 & 31...");
  const { data: lessons, error: err1 } = await supabase
    .from('lessons')
    .select('id, lesson_date, title, groups ( name )')
    .in('lesson_date', ['2026-07-30', '2026-07-31']);
  
  if (err1) {
    console.error("Error lessons:", err1.message);
    return;
  }
  
  console.log(`Found ${lessons.length} lessons:`);
  for (const lesson of lessons) {
    const { count } = await supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', lesson.id);
    
    console.log(`Lesson: ${lesson.title}, Date: ${lesson.lesson_date}, Group: ${lesson.groups?.name}, Attendance Records Count: ${count}`);
  }
}

run();
