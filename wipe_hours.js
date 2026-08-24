require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeHours() {
  const { data, error } = await supabase
    .from('teacher_subjects')
    .update({ completed_theory_hours: 0, completed_practice_hours: 0 })
    .gt('id', 0); // Updates all rows
    
  if (error) {
    console.error('Error updating:', error);
  } else {
    console.log('Successfully wiped old manual hours to 0.');
  }
}

wipeHours();
