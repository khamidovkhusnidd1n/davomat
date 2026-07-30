const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const supabaseUrl = 'https://uhbcnmcevcmpghwgsdsc.supabase.co';
const fs = require('fs');
const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);
const org_id = "11111111-1111-1111-1111-111111111111";

const teachers = [
    {"full_name": "Nuridinov Akmal Vaxobjanovich", "phone": "+998901234567", "education_type": "qayta_tayyorlov", "subjects": ["Rangtasvir", "Tasviriy san'at"]},
    {"full_name": "Alimkulova Dilzoda Rayimkulovna", "phone": "+998931234567", "education_type": "qayta_tayyorlov", "subjects": ["San'at tarixi", "Muzeyshunoslik"]},
    {"full_name": "Axmadaliyev Farrux Fayzullaxonovich", "phone": "+998941234567", "education_type": "qayta_tayyorlov", "subjects": ["Dastgohli rangtasvir"]},
    {"full_name": "Inagamova Lola Usmanbekovna", "phone": "+998951234567", "education_type": "qayta_tayyorlov", "subjects": ["Pedagogika", "Psixologiya"]},
    {"full_name": "Baymuradov Shohruh Maxmudovich", "phone": "+998971234567", "education_type": "qayta_tayyorlov", "subjects": ["Iqtisodiyot"]},
    {"full_name": "Sultanov Shavkat Fazilovich", "phone": "+998981234567", "education_type": "qayta_tayyorlov", "subjects": ["Rangtasvir"]},
    {"full_name": "Kulmanov Yerik Nesipbekovich", "phone": "+998991234567", "education_type": "qayta_tayyorlov", "subjects": ["Dastgohli rangtasvir"]},
    {"full_name": "Qiyomov Zuhriddin", "phone": "+998911234567", "education_type": "qayta_tayyorlov", "subjects": ["Chizmatasvir"]},
    {"full_name": "Sabirbayev S.", "phone": "+998900000001", "education_type": "qayta_tayyorlov", "subjects": ["Tasviriy san'at"]},
    {"full_name": "Rajabov U.", "phone": "+998900000002", "education_type": "qayta_tayyorlov", "subjects": ["Tasviriy san'at"]}
];

const academic_year = "2025-2026";

async function run() {
  console.log("Starting teacher import in Node...");
  for (const t of teachers) {
    try {
      // 1. Insert teacher
      const { data: teacherData, error: tErr } = await supabase.from("teachers").upsert({
          "organization_id": org_id,
          "full_name": t.full_name,
          "phone": t.phone,
          "education_type": t.education_type
      }, { onConflict: "organization_id,full_name" }).select("id").single();
      
      if (tErr) throw tErr;
      
      const teacher_id = teacherData.id;
      console.log(`Teacher added/updated: ${t.full_name} (ID: ${teacher_id})`);
      
      // 2. Process subjects
      for (const s_name of t.subjects) {
          // Insert subject
          const { data: subjectData, error: sErr } = await supabase.from("subjects").upsert({
              "organization_id": org_id,
              "name": s_name
          }, { onConflict: "organization_id,name" }).select("id").single();
          
          if (sErr) throw sErr;
          const subject_id = subjectData.id;
          
          // Link teacher to subject
          const { error: tsErr } = await supabase.from("teacher_subjects").upsert({
              "teacher_id": teacher_id,
              "subject_id": subject_id,
              "allocated_hours": 120, // Default allocated hours
              "academic_year": academic_year
          }, { onConflict: "teacher_id,subject_id,academic_year" });
          
          if (tsErr) throw tsErr;
          console.log(`  Linked to subject: ${s_name}`);
      }
    } catch (e) {
      console.error(`Error importing ${t.full_name}:`, e.message);
    }
  }
  console.log("Done importing teachers!");
}

run();
