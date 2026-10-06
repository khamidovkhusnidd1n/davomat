const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uhbcnmcevcmpghwgsdsc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoYmNubWNldmNtcGdod2dzZHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkwNDU1NCwiZXhwIjoyMDk4NDgwNTU0fQ.Rw2sLtNI7kMUZTNgUuc7awG5YJltH0UTX_Y94T5bjFE'
);

async function run() {
  // 1. Add columns via SQL
  const sql = `
    ALTER TABLE groups ADD COLUMN IF NOT EXISTS total_hours INT DEFAULT 0;
    ALTER TABLE groups ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE groups ADD COLUMN IF NOT EXISTS end_date DATE;
  `;

  const res = await fetch('https://uhbcnmcevcmpghwgsdsc.supabase.co/rest/v1/rpc/exec_sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoYmNubWNldmNtcGdod2dzZHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkwNDU1NCwiZXhwIjoyMDk4NDgwNTU0fQ.Rw2sLtNI7kMUZTNgUuc7awG5YJltH0UTX_Y94T5bjFE',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoYmNubWNldmNtcGdod2dzZHNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkwNDU1NCwiZXhwIjoyMDk4NDgwNTU0fQ.Rw2sLtNI7kMUZTNgUuc7awG5YJltH0UTX_Y94T5bjFE'
    },
    body: JSON.stringify({ query: sql })
  });
  console.log('RPC status:', res.status);
  const txt = await res.text();
  console.log('RPC result:', txt);

  // If RPC doesn't exist, try via Supabase Management API (pgMeta)
  // Let's just try updating directly — if total_hours column doesn't exist yet, 
  // we'll handle it differently

  // 2. Check if column exists
  const { data: test, error: testErr } = await supabase.from('groups').select('id, name, total_hours').limit(1);
  if (testErr) {
    console.log('Column does not exist yet:', testErr.message);
    console.log('Please add total_hours, start_date, end_date columns via Supabase Dashboard SQL Editor');
    console.log('SQL:\n', sql);
  } else {
    console.log('Columns exist! Updating groups...');
    await updateGroups();
  }
}

async function updateGroups() {
  const { data: groups } = await supabase.from('groups').select('*');
  
  for (const g of groups) {
    let totalHours = 144; // default malaka oshirish

    // Tarbiyachi
    if (g.course_name && g.course_name.toLowerCase().includes('tarbiyachi')) {
      totalHours = 72;
    }
    // Qayta tayyorlash
    else if (g.education_type === 'qayta_tayyorlov') {
      if (g.course_name && g.course_name.toLowerCase().includes('rangtasvir')) {
        totalHours = 864;
      } else {
        // Kashta, zardo'st va boshqa qayta tayyorlash
        totalHours = 720;
      }
    }

    const { error } = await supabase
      .from('groups')
      .update({ total_hours: totalHours })
      .eq('id', g.id);

    console.log(`${g.name}: ${totalHours} soat ${error ? 'XATO: ' + error.message : 'OK'}`);
  }
}

run().catch(console.error);
