const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("1. Renaming group course_name...");
  const { error: errGroup } = await supabase
    .from('groups')
    .update({ course_name: 'Rangtasvir' })
    .eq('name', 'Rangtasvir 14-guruh');
  
  if (errGroup) {
    console.error("Group rename error:", errGroup.message);
  } else {
    console.log("Successfully updated group course_name to 'Rangtasvir'.");
  }

  console.log("2. Deleting the empty duplicate lesson for today...");
  const { error: errDel } = await supabase
    .from('lessons')
    .delete()
    .eq('id', 'edc6b6b1-9170-46ef-b86d-e0b71ea41b44');
  
  if (errDel) {
    console.error("Lesson delete error:", errDel.message);
  } else {
    console.log("Successfully deleted empty duplicate lesson 'edc6b6b1-9170-46ef-b86d-e0b71ea41b44'.");
  }

  console.log("3. Updating the lesson with attendance...");
  const { error: errUpd } = await supabase
    .from('lessons')
    .update({ title: '09:00-15:00 | Rangtasvir (Alimov Umid) (Updated)' })
    .eq('id', '3df92e6f-7f23-4730-be2e-be572741fe2d');
  
  if (errUpd) {
    console.error("Lesson update error:", errUpd.message);
  } else {
    console.log("Successfully renamed today's lesson '3df92e6f-7f23-4730-be2e-be572741fe2d' to '09:00-15:00 | Rangtasvir (Alimov Umid) (Updated)'.");
  }

  console.log("4. Checking for other lessons with 'Tasviriy san'at' in title...");
  const { data: oldLessons } = await supabase
    .from('lessons')
    .select('id, title, lesson_date')
    .ilike('title', '%Tasviriy san\'at%');
  
  if (oldLessons && oldLessons.length > 0) {
    console.log(`Found ${oldLessons.length} older lessons to rename:`);
    for (const les of oldLessons) {
      const newTitle = les.title.replace(/Tasviriy san'at/gi, 'Rangtasvir');
      const { error: errOldUpd } = await supabase
        .from('lessons')
        .update({ title: newTitle })
        .eq('id', les.id);
      
      if (errOldUpd) {
        console.error(`Failed to update lesson ${les.id}:`, errOldUpd.message);
      } else {
        console.log(`Updated: "${les.title}" -> "${newTitle}" on ${les.lesson_date}`);
      }
    }
  } else {
    console.log("No older lessons with 'Tasviriy san'at' in title.");
  }
}

run();
