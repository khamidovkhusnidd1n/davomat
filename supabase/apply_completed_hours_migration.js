const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

const sql = `
  ALTER TABLE public.teacher_subjects
  ADD COLUMN IF NOT EXISTS completed_hours INTEGER NOT NULL DEFAULT 0;

  COMMENT ON COLUMN public.teacher_subjects.completed_hours IS 'O''qituvchi tomonidan shu fan bo''yicha o''tilgan soatlar (tizimdan tashqari/qo''lda kiritilgan)';
`;

async function run() {
  console.log("Applying completed_hours column migration to database via execute_sql_temp...");
  const { data, error } = await supabase.rpc('execute_sql_temp', { sql_query: sql });
  if (error) {
    console.error("Migration failed:", error.message);
  } else {
    console.log("Migration applied successfully! Output:", data);
  }
}

run();
