require('dotenv').config({ path: 'admin/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function exportData() {
  const { data, error } = await supabase.from('students').select('*');
  if (error) { console.error('DB Error:', error); return; }
  
  if (!data || data.length === 0) {
    console.log('No data found in students table');
    return;
  }
  
  const cols = Object.keys(data[0]);
  let csv = cols.join(',') + '\n';
  
  data.forEach(row => {
    csv += cols.map(c => {
      let val = row[c] === null ? '' : String(row[c]);
      val = val.replace(/"/g, '""');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`;
      }
      return val;
    }).join(',') + '\n';
  });
  
  fs.writeFileSync('C:/Users/Salohiddin Markaz/Downloads/Tinglovchilar_Malumoti.csv', csv);
  console.log('Exported ' + data.length + ' rows to CSV in Downloads');
}

exportData();
