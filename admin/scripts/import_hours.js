const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const dir = 'C:\\\\Users\\\\Salohiddin Markaz\\\\Desktop\\\\oqituvchilar';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

  const { data: teachers, error: tErr } = await supabase.from('teachers').select('id, full_name');
  if (tErr) throw tErr;

  const { data: teacherSubjects, error: tsErr } = await supabase.from('teacher_subjects').select('id, teacher_id, completed_theory_hours');
  if (tsErr) throw tsErr;

  let totalUpdated = 0;
  let notFound = [];

  for (const f of files) {
    console.log(`Processing file: ${f}`);
    const workbook = XLSX.readFile(dir + '\\\\' + f);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    for (const row of data) {
      if (row.length > 5 && typeof row[0] === 'number') {
        const fullName = row[1]?.trim();
        const hours = Number(row[5]);
        
        if (fullName && !isNaN(hours) && hours > 0) {
          const teacher = teachers.find(t => {
            const tName = t.full_name.toLowerCase().replace(/\s+/g, ' ');
            const eName = fullName.toLowerCase().replace(/\s+/g, ' ');
            return tName.includes(eName) || eName.includes(tName);
          });

          if (teacher) {
            const tSubs = teacherSubjects.filter(ts => ts.teacher_id === teacher.id);
            if (tSubs.length > 0) {
              const tsId = tSubs[0].id;
              const currentHours = tSubs[0].completed_theory_hours || 0;
              const newHours = currentHours + hours;
              
              tSubs[0].completed_theory_hours = newHours;
              
              await supabase.from('teacher_subjects').update({ completed_theory_hours: newHours }).eq('id', tsId);
              console.log(`Updated ${fullName}: +${hours} (Total now: ${newHours})`);
              totalUpdated++;
            } else {
              notFound.push(`${fullName} (Found teacher, but no subjects assigned)`);
            }
          } else {
            notFound.push(`${fullName} (Teacher not found in DB)`);
          }
        }
      }
    }
  }

  console.log('\n--- SUMMARY ---');
  console.log(`Total successfully updated: ${totalUpdated}`);
  if (notFound.length > 0) {
    console.log(`Could not update ${notFound.length} entries:`);
    notFound.forEach(n => console.log(' - ' + n));
  }
}

run().catch(console.error);
