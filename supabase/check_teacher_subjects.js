const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: tsList } = await supabase
    .from('teacher_subjects')
    .select(`
      id,
      completed_hours,
      allocated_hours,
      teachers(full_name),
      subjects(name)
    `);

  console.log("Teacher subjects manual hours:");
  for (const ts of tsList || []) {
    console.log(`- Teacher: ${ts.teachers?.full_name}, Subject: ${ts.subjects?.name}, Allocated: ${ts.allocated_hours}, Completed: ${ts.completed_hours}`);
  }
}

run();
