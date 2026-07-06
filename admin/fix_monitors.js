const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.join('=').trim();
});

const supabase = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY']);

async function fixMonitors() {
  // Barcha guruhlarni olamiz
  const { data: groups } = await supabase.from('groups').select('id, name');
  
  for (const group of groups) {
    // Guruhning monitorini topamiz
    const { data: monitorIds } = await supabase
      .from('students')
      .select('user_id, users!inner(role)')
      .eq('group_id', group.id)
      .eq('users.role', 'monitor');

    if (monitorIds && monitorIds.length > 0) {
      const monitorId = monitorIds[0].user_id;
      
      // Guruhdagi monitor_id ni yangilaymiz
      await supabase.from('groups').update({ monitor_id: monitorId }).eq('id', group.id);
      console.log(`Guruh: ${group.name} -> Monitor biriktirildi: ${monitorId}`);
    }
  }
}

fixMonitors();
