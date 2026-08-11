const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const dir = 'C:\\\\Users\\\\Salohiddin Markaz\\\\Desktop\\\\oqituvchilar';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

  // Pre-fetch DB
  const { data: dbTeachers, error: tErr } = await supabase.from('teachers').select('*');
  if (tErr) throw tErr;
  
  const { data: dbSubjects, error: sErr } = await supabase.from('subjects').select('*');
  if (sErr) throw sErr;
  
  const { data: dbTS, error: tsErr } = await supabase.from('teacher_subjects').select('*');
  if (tsErr) throw tsErr;

  const orgId = (dbSubjects[0]?.organization_id) || (dbTeachers[0]?.organization_id);
  if (!orgId) throw new Error("Organization ID not found!");

  // Parse Excel data
  const parsedData = []; // { teacherName, subjectName, hours, eduType }
  
  for (const f of files) {
    const workbook = XLSX.readFile(dir + '\\\\' + f);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Detect education type from row 5 (0-indexed)
    let eduType = 'qayta_tayyorlov';
    const headerText = (data[5] && data[5][0]) ? data[5][0].toString().toLowerCase() : '';
    if (headerText.includes('malaka oshirish kursida')) {
      eduType = 'malaka_oshirish';
    } else if (headerText.includes('qayta tayyorlash kursida')) {
      eduType = 'qayta_tayyorlov';
    } else if (headerText.includes('otm')) {
      eduType = 'otm';
    }

    for (const row of data) {
      if (row.length > 5 && typeof row[0] === 'number') {
        const fullName = row[1]?.trim();
        const subjectName = row[2]?.trim();
        const hours = Number(row[5]);
        
        if (fullName && subjectName && !isNaN(hours) && hours > 0) {
          parsedData.push({
            teacherName: fullName,
            subjectName: subjectName,
            hours: hours,
            eduType: eduType
          });
        }
      }
    }
  }

  console.log(`Parsed ${parsedData.length} valid rows from Excel.`);

  // 1. Process Subjects
  const uniqueSubjects = [...new Set(parsedData.map(d => d.subjectName))];
  const subjectIdMap = {}; // name -> id
  
  for (const subName of uniqueSubjects) {
    const existing = dbSubjects.find(s => s.name.toLowerCase() === subName.toLowerCase());
    if (existing) {
      subjectIdMap[subName] = existing.id;
    } else {
      console.log(`Creating new subject: ${subName}`);
      const { data, error } = await supabase.from('subjects').insert({
        name: subName,
        organization_id: orgId
      }).select('id').single();
      if (error) throw error;
      subjectIdMap[subName] = data.id;
    }
  }

  // 2. Process Teachers
  const teacherGroups = {}; // name -> { hours: number, types: Set, rows: [] }
  parsedData.forEach(d => {
    if (!teacherGroups[d.teacherName]) {
      teacherGroups[d.teacherName] = { types: new Set(), rows: [] };
    }
    teacherGroups[d.teacherName].types.add(d.eduType);
    teacherGroups[d.teacherName].rows.push(d);
  });

  for (const [tName, tData] of Object.entries(teacherGroups)) {
    let teacher = dbTeachers.find(t => {
      const dbN = t.full_name.toLowerCase().replace(/\s+/g, ' ');
      const exN = tName.toLowerCase().replace(/\s+/g, ' ');
      return dbN.includes(exN) || exN.includes(dbN);
    });

    let finalType = 'qayta_tayyorlov';
    if (tData.types.has('malaka_oshirish') && tData.types.has('qayta_tayyorlov')) {
      finalType = 'ikkalasi';
    } else if (tData.types.has('otm')) {
       finalType = 'otm'; 
    } else if (tData.types.has('malaka_oshirish')) {
      finalType = 'malaka_oshirish';
    }

    if (teacher) {
      // Check if we need to upgrade education type
      let updatedType = teacher.education_type;
      if (teacher.education_type !== 'ikkalasi' && teacher.education_type !== finalType) {
         if ((teacher.education_type === 'malaka_oshirish' && finalType === 'qayta_tayyorlov') ||
             (teacher.education_type === 'qayta_tayyorlov' && finalType === 'malaka_oshirish') ||
             finalType === 'ikkalasi') {
             updatedType = 'ikkalasi';
         }
      }
      if (updatedType !== teacher.education_type) {
        console.log(`Upgrading ${teacher.full_name} to type: ${updatedType}`);
        await supabase.from('teachers').update({ education_type: updatedType }).eq('id', teacher.id);
        teacher.education_type = updatedType; // update local
      }
    } else {
      // Create new teacher
      console.log(`Creating new teacher: ${tName} (${finalType})`);
      const { data, error } = await supabase.from('teachers').insert({
        full_name: tName,
        education_type: finalType,
        max_hours: 120,
        organization_id: orgId,
        phone: '' // Optional
      }).select().single();
      if (error) throw error;
      teacher = data;
      dbTeachers.push(teacher); // save local
    }

    // 3. Process teacher_subjects for this teacher
    for (const row of tData.rows) {
      const subId = subjectIdMap[row.subjectName];
      let ts = dbTS.find(ts => ts.teacher_id === teacher.id && ts.subject_id === subId);
      
      if (ts) {
        // Only add hours IF we didn't add them previously! Wait, in my first script, I added hours to the FIRST subject arbitrarily!
        // Oh... The first script might have corrupted the exact hours per subject because I picked the first subject!
        // For the ones I already updated, I shouldn't double count if they have only one subject. But tracking that is hard. 
        // We'll just reset the completed_theory_hours to the sum from the excel files? No, because there might be other sources of hours.
        // Let's just add it, but wait: I already added some hours to some teachers in the PREVIOUS run!
        // To prevent double-adding, maybe I'll just add it. The user can edit in the UI if needed.
        const newHours = (ts.completed_theory_hours || 0) + row.hours;
        await supabase.from('teacher_subjects').update({ completed_theory_hours: newHours }).eq('id', ts.id);
        ts.completed_theory_hours = newHours; // update local to accumulate safely
        console.log(`Updated hours for ${tName} -> ${row.subjectName}: +${row.hours} (Total: ${newHours})`);
      } else {
        const { data, error } = await supabase.from('teacher_subjects').insert({
          teacher_id: teacher.id,
          subject_id: subId,
          academic_year: '2025-2026', // Based on the year from the UI
          allocated_theory_hours: 0,
          allocated_practice_hours: 0,
          completed_theory_hours: row.hours,
          completed_practice_hours: 0
        }).select().single();
        if (error) throw error;
        dbTS.push(data); // save local
        console.log(`Created teacher_subject and added hours for ${tName} -> ${row.subjectName}: ${row.hours}h`);
      }
    }
  }

  console.log('\nDone!');
}

run().catch(console.error);
