const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.from('users').select('id, full_name').eq('role', 'tutor');
  console.log('Tutors Res:', { data, error });
  
  const { data: data2, error: error2 } = await supabase.from('groups').select('*');
  console.log('Groups Res:', { data: data2, error: error2 });
}

test();
