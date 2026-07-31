const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: lessons } = await supabase
    .from('lessons')
    .select(`
      id,
      lesson_date,
      title,
      teachers(full_name),
      subjects(name)
    `);

  console.log("Lessons list in DB:");
  for (const l of lessons || []) {
    console.log(`- Date: ${l.lesson_date}, Title: ${l.title}, Teacher: ${l.teachers?.full_name}, Subject: ${l.subjects?.name}`);
  }
}

run();
