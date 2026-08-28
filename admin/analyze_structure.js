const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\tmp_oqituvchi2\\oqituvchi';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx')).sort();

// First pass: just show structure of each file
files.forEach(file => {
  const wb = XLSX.readFile(path.join(dir, file));
  console.log(`\n========== ${file} ==========`);
  console.log('Sheets:', wb.SheetNames);
  
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    console.log(`\n  --- Sheet: "${sheetName}" ---`);
    
    // Find header row
    let headerRowIdx = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row) {
        for (let j = 0; j < row.length; j++) {
          if (typeof row[j] === 'string' && row[j].includes('F.I.SH')) {
            headerRowIdx = i;
            break;
          }
        }
      }
      if (headerRowIdx !== -1) break;
    }
    
    if (headerRowIdx === -1) {
      console.log('  [NO HEADER FOUND]');
      return;
    }
    
    console.log('  Header row:', headerRowIdx, JSON.stringify(data[headerRowIdx]));
    
    // Find group separators (rows where col0 has text but no teacher/subject)
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      // Check if this is a group separator row
      const firstCell = row[0];
      const hasTeacher = row[1] && typeof row[1] === 'string' && row[1].length > 3;
      const hasSubject = row[2] && typeof row[2] === 'string';
      
      if (firstCell && typeof firstCell === 'string' && !hasTeacher && !hasSubject) {
        console.log(`  [GROUP]: "${firstCell}"`);
      }
    }
  });
});
