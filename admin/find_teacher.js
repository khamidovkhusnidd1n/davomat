const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\tmp_oqituvchi3\\oqituvchi';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx')).sort();

console.log('=== Abdukarimov qidiruv ===\n');

files.forEach(file => {
  const wb = XLSX.readFile(path.join(dir, file));
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row) {
        for (let j = 0; j < row.length; j++) {
          if (typeof row[j] === 'string' && row[j].toLowerCase().includes('abdukarimov')) {
            console.log('TOPILDI!');
            console.log('  Fayl:', file);
            console.log('  Sheet:', sheetName);
            console.log('  Qator:', i + 1);
            console.log('  Ustun:', j);
            console.log('  Qator data:', JSON.stringify(row));
            console.log('');
          }
        }
      }
    }
  });
});

console.log('=== Qidiruv tugadi ===');
