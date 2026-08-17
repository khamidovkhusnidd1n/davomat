const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let SUPABASE_URL = '';
let SUPABASE_KEY = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SUPABASE_KEY = line.split('=')[1].trim();
});

if (!SUPABASE_KEY) {
  envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) SUPABASE_KEY = line.split('=')[1].trim();
  });
}

// Fetch users with role=student
fetch(SUPABASE_URL + '/rest/v1/users?role=eq.student&select=id,full_name,email,phone,telegram_id,created_at', {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY
  }
})
.then(r => r.json())
.then(data => {
  if (!data || data.length === 0) {
    console.log('No data found in users table for students');
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
  
  let html = '<table border="1"><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>';
  data.forEach(row => {
    html += '<tr>' + cols.map(c => `<td>${row[c] === null ? '' : String(row[c])}</td>`).join('') + '</tr>';
  });
  html += '</table>';
  
  fs.writeFileSync('C:/Users/Salohiddin Markaz/Downloads/Tinglovchilar_Toliq_Malumoti.xls', html);
  fs.writeFileSync('C:/Users/Salohiddin Markaz/Downloads/Tinglovchilar_Toliq_Malumoti.csv', csv);
  console.log('Exported ' + data.length + ' rows to CSV/XLS in Downloads');
}).catch(err => {
    console.error(err);
});
