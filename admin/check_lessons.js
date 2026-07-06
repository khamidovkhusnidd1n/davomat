const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.join('=').trim();
});

const supabase = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY']);

async function checkLessons() {
  const { data: lessons, error } = await supabase.from('lessons').select('*');
  console.log("Lessons length:", lessons.length);
  lessons.forEach(l => console.log(l.title));
}

checkLessons();
