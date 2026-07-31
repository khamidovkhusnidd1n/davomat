const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking teachers table...");
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('*');
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Total teachers:", teachers.length);
    if (teachers.length > 0) {
      console.log("Sample teachers:", teachers.slice(0, 10));
    }
  }
}

run();
