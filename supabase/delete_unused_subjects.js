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
  console.log("Checking subjects in database...");
  const { data: subjects, error } = await supabase.from('subjects').select('*');
  if (error) {
    console.error("Error fetching subjects:", error);
    return;
  }

  console.log(`Found ${subjects.length} subjects in database:`);
  for (const sub of subjects) {
    const isAllowed = allowedSubjects.some(name => name.toLowerCase() === sub.name.toLowerCase());
    
    // Check if subject is used in schedules, lessons, or teacher_subjects
    const { count: schCount } = await supabase.from('schedules').select('id', { count: 'exact', head: true }).eq('subject_id', sub.id);
    const { count: lesCount } = await supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('subject_id', sub.id);
    const { count: tsCount } = await supabase.from('teacher_subjects').select('id', { count: 'exact', head: true }).eq('subject_id', sub.id);
    
    const isUsed = schCount > 0 || lesCount > 0 || tsCount > 0;
    
    console.log(`- "${sub.name}" (ID: ${sub.id}): Allowed=${isAllowed}, Used=${isUsed} (sch:${schCount}, les:${lesCount}, ts:${tsCount})`);
    
    if (!isAllowed && !isUsed) {
      console.log(`  -> Deleting unused subject: "${sub.name}"...`);
      const { error: delErr } = await supabase.from('subjects').delete().eq('id', sub.id);
      if (delErr) {
        console.error(`     Failed to delete "${sub.name}":`, delErr.message);
      } else {
        console.log(`     Successfully deleted "${sub.name}"`);
      }
    }
  }
}

run();
