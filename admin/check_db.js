const { createClient } = require('@supabase/supabase-js');

const NEXT_PUBLIC_SUPABASE_URL = 'https://uhbcnmcevcmpghwgsdsc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoYmNubWNldmNtcGdod2dzZHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkwNDU1NCwiZXhwIjoyMDk4NDgwNTU0fQ.Rw2sLtNI7kMUZTNgUuc7awG5YJltH0UTX_Y94T5bjFE';

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('users').select('*').is('email', null);
  console.log("Users with null email:", data ? data.length : 0);
  
  if (data && data.length > 0) {
    for (const u of data) {
      const words = (u.full_name || '').toLowerCase().trim().split(/\s+/);
      const loginBase = (words[0] + (words[1] ? '_' + words[1] : '')).replace(/[^a-z0-9_]/g, '');
      const uniqueSuffix = Math.floor(Math.random() * 10000);
      const finalLogin = `${loginBase}_${uniqueSuffix}`;
      
      await supabase.from('users').update({ email: finalLogin }).eq('id', u.id);
      console.log(`Updated ${u.full_name} -> ${finalLogin}`);
    }
  }
}

check();
