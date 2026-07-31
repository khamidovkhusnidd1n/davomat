const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

const DEFAULT_SUBJECT_HOURS = {
  "Ta'lim jarayoniga raqamli texnologiyalarni joriy etish": { theory: 4, practice: 8 },
  "Art marketing": { theory: 10, practice: 10 },
  "Tasviriy san'atning umumiy tarixi": { theory: 26, practice: 28 },
  "Tasviriy san'atda an'anaviy va zamonaviy uslublar": { theory: 8, practice: 22 },
  "Jonli odam qomatidan anatomik chizmatasvir": { theory: 6, practice: 50 },
  "Materialshunoslik va rangtasvir texnika texnologiyasi": { theory: 10, practice: 70 },
  "Chizmatasvir": { theory: 0, practice: 228 },
  "Rangtasvir": { theory: 0, practice: 228 },
  "Kompozitsiya": { theory: 0, practice: 114 },
  "Kompazitsiya": { theory: 0, practice: 114 },
  "San'at estetikasi": { theory: 16, practice: 0 },
  "Nutq madaniyati": { theory: 0, practice: 14 },
  "Yakuniy attestatsiya": { theory: 0, practice: 12 }
};

async function run() {
  console.log("Starting migration of existing teacher_subjects rows...");
  
  const { data: rows, error: fetchErr } = await supabase
    .from('teacher_subjects')
    .select(`
      id,
      allocated_hours,
      completed_hours,
      allocated_theory_hours,
      allocated_practice_hours,
      completed_theory_hours,
      completed_practice_hours,
      subjects(name)
    `);

  if (fetchErr) {
    console.error("Error fetching rows:", fetchErr.message);
    return;
  }

  console.log(`Fetched ${rows.length} rows. Processing...`);

  for (const r of rows) {
    const subName = r.subjects?.name || '';
    const totalAlloc = r.allocated_hours || 0;
    const totalComp = r.completed_hours || 0;

    let theoryAlloc = 0;
    let practiceAlloc = totalAlloc;
    let theoryComp = 0;
    let practiceComp = totalComp;

    // Check if subject has default hour mapping
    if (DEFAULT_SUBJECT_HOURS[subName]) {
      const mapping = DEFAULT_SUBJECT_HOURS[subName];
      theoryAlloc = mapping.theory;
      practiceAlloc = mapping.practice;

      // Split completed hours proportionally or fully if completed equals allocated
      if (totalComp >= totalAlloc) {
        theoryComp = theoryAlloc;
        practiceComp = practiceAlloc;
      } else {
        // If partially completed, fill theory first or divide proportionally
        theoryComp = Math.min(theoryAlloc, totalComp);
        practiceComp = totalComp - theoryComp;
      }
    }

    console.log(`Row ID ${r.id} (${subName}):`);
    console.log(`  Before: totalAlloc=${totalAlloc}, totalComp=${totalComp}`);
    console.log(`  Setting: theoryAlloc=${theoryAlloc}, practiceAlloc=${practiceAlloc}, theoryComp=${theoryComp}, practiceComp=${practiceComp}`);

    const { error: updateErr } = await supabase
      .from('teacher_subjects')
      .update({
        allocated_theory_hours: theoryAlloc,
        allocated_practice_hours: practiceAlloc,
        completed_theory_hours: theoryComp,
        completed_practice_hours: practiceComp
      })
      .eq('id', r.id);

    if (updateErr) {
      console.error(`  Error updating row ${r.id}:`, updateErr.message);
    } else {
      console.log(`  Row ${r.id} updated successfully!`);
    }
  }

  console.log("Migration complete!");
}

run();
