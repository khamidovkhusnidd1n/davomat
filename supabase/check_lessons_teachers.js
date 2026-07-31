const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking teacher links in lessons table...");
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, lesson_date, teacher_id');
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Total lessons:", data.length);
    const teacherCounts = {};
    data.forEach(l => {
      teacherCounts[l.teacher_id] = (teacherCounts[l.teacher_id] || 0) + 1;
    });
    console.log("Teacher ID counts in lessons:", teacherCounts);

    // Also look up those teacher IDs in teachers table
    const uniqueTeacherIds = Object.keys(teacherCounts).filter(id => id !== 'null');
    if (uniqueTeacherIds.length > 0) {
      const { data: teachers } = await supabase.from('teachers').select('id, full_name').in('id', uniqueTeacherIds);
      console.log("Teachers found matching these IDs:", teachers);
    }
  }
}

run();
