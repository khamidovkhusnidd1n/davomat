const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

const allowedSubjects = [
  "Chizmatasvir",
  "Rangtasvir",
  "Kompozitsiya",
  "Kompazitsiya",
  "Materialshunoslik va rangtasvir texnikasi",
  "Materialshunoslik va rangtasvir texnika texnologiyasi",
  "Art marketing"
];

async function run() {
  console.log("Purging unwanted subjects from database...");
  const { data: subjects, error } = await supabase.from('subjects').select('*');
  if (error) {
    console.error("Error fetching subjects:", error);
    return;
  }

  for (const sub of subjects) {
    const isAllowed = allowedSubjects.some(name => name.toLowerCase() === sub.name.toLowerCase());
    
    if (!isAllowed) {
      console.log(`Deleting subject: "${sub.name}" (ID: ${sub.id})...`);
      const { error: delErr } = await supabase.from('subjects').delete().eq('id', sub.id);
      if (delErr) {
        console.error(`Failed to delete "${sub.name}":`, delErr.message);
      } else {
        console.log(`Successfully deleted "${sub.name}"`);
      }
    }
  }
  
  console.log("\nPurge completed!");
}

run();
