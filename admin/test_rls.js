const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@itacademy.uz',
    password: 'Admin123!',
  });
  if (authError) {
    console.error('Login error:', authError.message);
    return;
  }
  
  const user = authData.user;
  console.log('Logged in as:', user.id);
  
  const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', user.id).single();
  if (userError) {
    console.error('User fetch error:', userError.message);
    return;
  }
  
  console.log('User data:', userData);
  
  const payload = {
    name: 'Test Group',
    course_name: 'Test Course',
    tutor_id: null,
    monitor_id: null,
    organization_id: userData.organization_id
  };
  
  const { data, error } = await supabase.from('groups').insert(payload).select();
  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert success:', data);
    await supabase.from('groups').delete().eq('id', data[0].id);
  }
}

test();
