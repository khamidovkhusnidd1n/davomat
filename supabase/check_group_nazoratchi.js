const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking group supervisors...");
  const { data: groups, error } = await supabase
    .from('groups')
    .select('id, name, nazoratchi_id, users!groups_nazoratchi_id_fkey(full_name)');
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    groups.forEach(g => {
      console.log(`Group: ${g.name}, Supervisor: ${g.users?.full_name || 'None'} (ID: ${g.nazoratchi_id})`);
    });
  }
}

run();
