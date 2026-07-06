const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.join('=').trim();
});

const supabase = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY']);

async function testDartLogic() {
  const scheduleGroupId = '20f37ff5-c0f0-43d3-8116-63d0ddc927ed'; // Frontend-1
  const todayStr = '2026-07-06';
  const lessonTitle = '09:00 darsi';

  const res = await supabase
    .from('lessons')
    .select('id')
    .eq('group_id', scheduleGroupId)
    .eq('lesson_date', todayStr)
    .eq('title', lessonTitle)
    .maybeSingle();

  console.log("existingLesson result:", res);
  
  if (!res.data) {
    const insertRes = await supabase
      .from('lessons')
      .insert({
        group_id: scheduleGroupId,
        lesson_date: todayStr,
        title: lessonTitle,
      })
      .select('id')
      .single();
    console.log("insert result:", insertRes);
  }
}

testDartLogic();
