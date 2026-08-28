const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\tmp_oqituvchi\\oqituvchi';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

const finalData = [];

files.forEach(file => {
  const wb = XLSX.readFile(path.join(dir, file));
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    let currentGroup = sheetName;
    
    let headerRowIdx = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i] && (data[i][1] === 'F.I.SH' || data[i][1] === 'F.I.Sh')) {
        headerRowIdx = i;
        break;
      }
    }
    
    if (headerRowIdx !== -1) {
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        if (row[0] && typeof row[0] === 'string' && !row[1] && !row[2]) {
           currentGroup = row[0];
           continue;
        }
        
        if (!row[0] && row[1] && typeof row[1] === 'string' && !row[2]) {
           continue;
        }
        
        const teacher = row[1];
        const subject = row[2];
        const hours = row[5];
        
        if (teacher && typeof teacher === 'string' && subject && typeof hours === 'number') {
           if (teacher.includes('Jami:')) continue;
           finalData.push({
             "O'qituvchi F.I.Sh": teacher.trim(),
             "Fan nomi": subject.trim(),
             "Guruh nomi": currentGroup.trim(),
             "Nazariy soat": hours,
             "Amaliy soat": 0
           });
        }
      }
    }
  });
});

const aggregated = {};
finalData.forEach(row => {
  const key = row["O'qituvchi F.I.Sh"] + '||' + row["Fan nomi"] + '||' + row["Guruh nomi"];
  if (!aggregated[key]) {
    aggregated[key] = { ...row };
  } else {
    aggregated[key]["Nazariy soat"] += row["Nazariy soat"];
  }
});

const out = Object.values(aggregated);
const outWs = XLSX.utils.json_to_sheet(out);
const outWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(outWb, outWs, "Soatlar");
XLSX.writeFile(outWb, 'C:\\Users\\Salohiddin Markaz\\Downloads\\Eski_darslar_Toza.xlsx');
console.log('Saved to Eski_darslar_Toza.xlsx, total rows: ' + out.length);
