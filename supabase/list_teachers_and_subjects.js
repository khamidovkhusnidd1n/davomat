const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Searching for teachers in the database...");
  const { data: teachers } = await supabase.from('teachers').select('*');
  console.log("All Teachers:");
  teachers.forEach(t => console.log(`- ID: ${t.id}, Name: ${t.full_name}`));

  console.log("\nSearching for subjects in the database...");
  const { data: subjects } = await supabase.from('subjects').select('*');
  console.log("All Subjects:");
  subjects.forEach(s => console.log(`- ID: ${s.id}, Name: ${s.name}`));
}

run();
