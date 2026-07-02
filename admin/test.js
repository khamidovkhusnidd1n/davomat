const fs = require('fs');
const env = fs.readFileSync('./.env.local', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLogin() {
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const admin = usersData.users.find(u => u.email === 'admin@app.local');
  if (admin) {
    console.log('Admin user found:', admin.email, 'Confirmed at:', admin.email_confirmed_at);
  } else {
    console.log('Admin user NOT found');
  }
}

testLogin();
