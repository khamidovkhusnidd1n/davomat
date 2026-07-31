const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Deleting all subjects in DB...");
  const { data, error } = await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error("Error deleting subjects:", error.message);
  } else {
    console.log("Successfully deleted all subjects!");
  }
}

run();
