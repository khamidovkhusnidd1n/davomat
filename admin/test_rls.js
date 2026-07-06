const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.join('=').trim();
});

const supabase = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function testAuth() {
  const { data, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'student1',
    password: 'student1'
  });
  if (authErr) { console.log(authErr); return; }
  
  const scheduleGroupId = '20f37ff5-c0f0-43d3-8116-63d0ddc927ed';
  
  try {
    const newLesson = await supabase
      .from('lessons')
      .insert({
        group_id: scheduleGroupId,
        lesson_date: '2026-07-06',
        title: 'Another Test',
      })
      .select('id')
      .single();
    console.log("Success:", newLesson);
  } catch (e) {
    console.log("Error caught:", e);
  }
}

testAuth();
