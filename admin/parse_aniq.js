const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Fresh extract
const dir = 'C:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\tmp_oqituvchi3\\oqituvchi';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx')).sort();

const allRows = [];

files.forEach(file => {
  const wb = XLSX.readFile(path.join(dir, file));
  
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Find header row (the one with F.I.SH)
    let headerRowIdx = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i]) {
        for (let j = 0; j < data[i].length; j++) {
          if (typeof data[i][j] === 'string' && data[i][j].includes('F.I.SH')) {
            headerRowIdx = i;
            break;
          }
        }
      }
      if (headerRowIdx !== -1) break;
    }
    
    if (headerRowIdx === -1) return;
    
    // Start with sheet name as default group
    let currentGroup = sheetName;
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const col0 = row[0]; // № yoki guruh nomi
      const col1 = row[1]; // F.I.SH
      const col2 = row[2]; // O'tayotgan darsi
      const col5 = row[5]; // Jami dars soati
      
      // --- Is this a GROUP HEADER row? ---
      // Pattern: col0 has string text, col1 is empty, col2 is empty
      if (col0 && typeof col0 === 'string' && !col1 && !col2) {
        const txt = col0.trim();
        // Skip noise rows
        if (txt.startsWith('Jami')) continue;
        if (txt.includes('Izoh:')) continue;
        if (txt.includes('soat bajarildi')) continue;
        if (txt.includes('plastik kartasi')) continue;
        if (txt.includes('Naturachi')) {
          currentGroup = txt;
          continue;
        }
        if (txt.length > 100) continue; // Long paragraph = izoh
        
        currentGroup = txt;
        continue;
      }
      
      // --- Is this a DATA row? (teacher) ---
      if (col1 && typeof col1 === 'string' && col1.length > 3 && col2 && typeof col5 === 'number') {
        if (col1.includes('Jami')) continue;
        
        allRows.push({
          teacher: col1.trim(),
          subject: col2.trim(),
          group: currentGroup.trim(),
          hours: col5,
          file: file,
          sheet: sheetName
        });
      }
    }
  });
});

console.log('Jami topilgan qatorlar (barcha oylar):', allRows.length);

// Aggregate: same teacher + subject + group = sum hours across months
const agg = {};
allRows.forEach(r => {
  const key = r.teacher + '|||' + r.subject + '|||' + r.group;
  if (!agg[key]) {
    agg[key] = { teacher: r.teacher, subject: r.subject, group: r.group, hours: 0 };
  }
  agg[key].hours += r.hours;
});

const result = Object.values(agg).sort((a, b) => a.teacher.localeCompare(b.teacher));
console.log('Agregatsiya (yig`ilgan) qatorlar:', result.length);
console.log('Jami soat:', result.reduce((s, r) => s + r.hours, 0));

// --- Create beautiful Excel ---
async function createExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Soatlar', {
    views: [{ state: 'frozen', ySplit: 2 }]
  });
  
  // Title
  sheet.mergeCells('A1:E1');
  const title = sheet.getCell('A1');
  title.value = "O'qituvchilarning 2026-yil (Yanvar-Iyun) o'tilgan soatlari";
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 32;
  
  // Headers
  const headers = ["O'qituvchi F.I.Sh", "Fan nomi", "Guruh nomi", "Nazariy soat", "Amaliy soat"];
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
  });
  headerRow.height = 28;
  
  sheet.getColumn(1).width = 38;
  sheet.getColumn(2).width = 50;
  sheet.getColumn(3).width = 45;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 14;
  
  // Data
  let prevTeacher = '';
  result.forEach((r, idx) => {
    const isNew = r.teacher !== prevTeacher;
    prevTeacher = r.teacher;
    
    // Put ALL hours into Nazariy, Amaliy = 0 (original data has only "Jami dars soati")
    const dataRow = sheet.addRow([r.teacher, r.subject, r.group, r.hours, 0]);
    
    const bg = idx % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF';
    dataRow.eachCell((cell, col) => {
      cell.border = { top: {style:'thin', color:{argb:'FFE5E7EB'}}, bottom: {style:'thin', color:{argb:'FFE5E7EB'}}, left: {style:'thin', color:{argb:'FFE5E7EB'}}, right: {style:'thin', color:{argb:'FFE5E7EB'}} };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isNew && col === 1 ? 'FFECFDF5' : bg } };
      if (col >= 4) cell.alignment = { horizontal: 'center' };
      if (col === 1) cell.font = { bold: isNew };
    });
  });
  
  const outputPath = 'C:\\Users\\Salohiddin Markaz\\Downloads\\Eski_darslar_ANIQ.xlsx';
  await workbook.xlsx.writeFile(outputPath);
  console.log('Saqlandi:', outputPath);
}

createExcel().catch(console.error);
