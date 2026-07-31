const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking students in Rangtasvir 14-guruh...");
  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('name', 'Rangtasvir 14-guruh')
    .single();
  
  if (!group) {
    console.log("Group not found");
    return;
  }

  const { data: students, error } = await supabase
    .from('students')
    .select('id, users(full_name)')
    .eq('group_id', group.id);
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Total students in Rangtasvir 14-guruh:", students.length);
    students.forEach(s => {
      console.log(`Student ID: ${s.id}, Name: ${s.users?.full_name}`);
    });
  }
}

run();
