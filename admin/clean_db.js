const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Env o'qish
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.join('=').trim();
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDB() {
  console.log("Tozalash boshlandi...");

  // 1. Darslar, jadvallar, davomat, guruhlarni o'chirish
  console.log("Guruhlar, darslar va davomat o'chirilmoqda...");
  const { error: groupErr } = await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (groupErr) console.error("Guruhlarni o'chirishda xatolik:", groupErr.message);

  // 2. Admin bo'lmagan barcha foydalanuvchilarni topib o'chirish
  console.log("Foydalanuvchilarni o'qish...");
  const { data: usersToDel, error: userSelErr } = await supabase
    .from('users')
    .select('id, role')
    .neq('role', 'admin');

  if (userSelErr) {
    console.error("Userlarni o'qishda xatolik:", userSelErr.message);
  } else if (usersToDel && usersToDel.length > 0) {
    console.log(`${usersToDel.length} ta foydalanuvchini auth tizimidan o'chirish...`);
    for (const u of usersToDel) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.error(`User ${u.id} o'chmadi:`, delErr.message);
      }
    }
  }

  // Shuningdek courses va organizations larni ham tozalash kerakmi?
  // Odatda yo'nalishlar (courses) qolsa yaxshi bo'ladi, lekin keling ularni ham o'chiramiz:
  // Yo'q, "darslar hamda boshqa narsalar tizimni ready holatga keltir" degani asosan import bo'lgan ma'lumotlardir.
  
  console.log("✅ Tozalash muvaffaqiyatli yakunlandi! Tizim tayyor holatda.");
}

cleanDB();
