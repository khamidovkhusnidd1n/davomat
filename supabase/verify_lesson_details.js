const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking group course names...");
  const { data: groups, error } = await supabase
    .from('groups')
    .select('id, name, course_name');
  
  if (error) {
    console.error("Error:", error.message);
    return;
  }

  groups.forEach(g => {
    console.log(`Group ID: ${g.id}, Name: "${g.name}", CourseName: "${g.course_name}"`);
  });
}

run();
