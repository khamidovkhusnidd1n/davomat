const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking who marked attendance...");
  const { data: users } = await supabase.from('users').select('id, full_name, role');
  const { data: attendance } = await supabase.from('attendance').select('id, marked_by, lesson_id, lessons(lesson_date, title)');

  const userMap = {};
  users.forEach(u => userMap[u.id] = u);

  const stats = {};
  attendance.forEach(a => {
    const user = userMap[a.marked_by];
    const name = user ? `${user.full_name} (${user.role})` : 'Unknown/Tizim';
    stats[name] = (stats[name] || 0) + 1;
  });

  console.log("Attendance count marked by users:", stats);
}

run();
