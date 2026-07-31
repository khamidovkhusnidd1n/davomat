const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking academic years in teacher_subjects...");
  const { data, error } = await supabase
    .from('teacher_subjects')
    .select('id, teacher_id, subject_id, allocated_hours, academic_year');
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Total teacher_subjects:", data.length);
    const years = {};
    data.forEach(x => {
      years[x.academic_year] = (years[x.academic_year] || 0) + 1;
    });
    console.log("Academic year counts:", years);
    if (data.length > 0) {
      console.log("Sample records:", data.slice(0, 5));
    }
  }
}

run();
