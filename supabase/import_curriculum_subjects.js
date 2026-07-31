const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

const orgId = '11111111-1111-1111-1111-111111111111';

const curriculumSubjects = [
  { name: "Ta'lim jarayoniga raqamli texnologiyalarni joriy etish" },
  { name: "Art marketing" },
  { name: "Tasviriy san'atning umumiy tarixi" },
  { name: "Tasviriy san'atda an'anaviy va zamonaviy uslublar" },
  { name: "Jonli odam qomatidan anatomik chizmatasvir" },
  { name: "Materialshunoslik va rangtasvir texnika texnologiyasi" },
  { name: "Chizmatasvir" },
  { name: "Rangtasvir" },
  { name: "Kompozitsiya" },
  { name: "San'at estetikasi" },
  { name: "Nutq madaniyati" },
  { name: "Yakuniy attestatsiya" }
];

async function run() {
  console.log("Importing educational curriculum subjects from markdown file...");
  
  for (const sub of curriculumSubjects) {
    const { data: existing } = await supabase
      .from('subjects')
      .select('id')
      .eq('organization_id', orgId)
      .ilike('name', sub.name)
      .maybeSingle();

    if (existing) {
      console.log(`Subject already exists: "${sub.name}"`);
    } else {
      const { data: inserted, error } = await supabase
        .from('subjects')
        .insert({
          organization_id: orgId,
          name: sub.name
        })
        .select('*')
        .single();

      if (error) {
        console.error(`Error inserting "${sub.name}":`, error.message);
      } else {
        console.log(`Successfully created subject: "${inserted.name}"`);
      }
    }
  }

  console.log("\nSubjects import finished!");
}

run();
