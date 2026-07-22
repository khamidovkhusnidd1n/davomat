const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://uhbcnmcevcmpghwgsdsc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoYmNubWNldmNtcGdod2dzZHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkwNDU1NCwiZXhwIjoyMDk4NDgwNTU0fQ.Rw2sLtNI7kMUZTNgUuc7awG5YJltH0UTX_Y94T5bjFE', { auth: { autoRefreshToken: false, persistSession: false } });
async function check() {
  const { data } = await supabase.from('users').select('*');
  console.log('Total users left:', data?.length);
}
check();
