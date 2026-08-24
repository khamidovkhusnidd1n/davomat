require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function reset() {
  const { data: user } = await supabase.from('users').select('id').eq('phone', '+998870781604').single();
  if (!user) return console.log("User not found");
  
  const { data, error } = await supabase.from('test_results').delete().eq('user_id', user.id);
  console.log("Deleted", error || "Success");
}
reset();
