const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: teachers } = await supabase.from('teachers').select('id, full_name');
  
  for (const t of teachers) {
    const { count, error } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', t.id);
      
    console.log(`Teacher "${t.full_name}" has ${count} lessons in DB (Error: ${error ? error.message : 'none'})`);
  }
}

run();
