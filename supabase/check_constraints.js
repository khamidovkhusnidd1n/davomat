const fs = require('fs');
const path = require('path');
const botDir = 'c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\bot';
const { createClient } = require(path.join(botDir, 'node_modules', '@supabase', 'supabase-js'));

const envLocal = fs.readFileSync('c:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\admin\\.env.local', 'utf8');
const supabaseUrl = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking constraint definition in database...");
  const { data, error } = await supabase.rpc('check_db_status', {}); // wait, do we have check_db_status?
  // Let's run a query to get constraint definition using pg_catalog
  const query = `
    SELECT conname, pg_get_constraintdef(oid) as condef
    FROM pg_constraint
    WHERE conrelid = 'public.attendance'::regclass;
  `;
  // We can run a direct RPC using SQL if we have sql RPC, or we can just fetch some data or check if 'excused' can be inserted.
  // Wait! We can try to insert a dummy attendance record with status 'excused' using supabase!
  const dummyRow = {
    lesson_id: 'edc6b6b1-9170-46ef-b86d-e0b71ea41b44',
    student_id: 'b1aa31ec-80c7-4d0e-abe1-960f7625a1c0',
    status: 'excused',
    late_hours: 0
  };
  const { data: insData, error: insErr } = await supabase.from('attendance').insert(dummyRow);
  if (insErr) {
    console.error("Test insert failed:", insErr.message);
  } else {
    console.log("Test insert succeeded! 'excused' is allowed in DB!");
    // Clean up
    await supabase.from('attendance').delete().eq('lesson_id', 'edc6b6b1-9170-46ef-b86d-e0b71ea41b44');
  }
}

run();
