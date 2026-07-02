const fs = require('fs');
const env = fs.readFileSync('./.env.local', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resetPasswords() {
  const { data: usersData, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  for (const user of usersData.users) {
    if (user.email === 'admin@app.local') continue; // Skip admin
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: '123456'
    });
    
    if (updateError) {
      console.error('Failed to update password for', user.email, updateError);
    } else {
      console.log('Successfully reset password for', user.email, 'to 123456');
    }
  }
  
  console.log('All non-admin passwords reset to 123456');
}

resetPasswords();
