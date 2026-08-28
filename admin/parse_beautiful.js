const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Salohiddin Markaz\\Desktop\\davomat\\tmp_oqituvchi2\\oqituvchi';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx')).sort();

const SKIP_GROUPS = ['Jami', 'Jami:', 'Izoh:', 'Naturachi (libosli)'];
const finalData = [];

files.forEach(file => {
  const month = file.replace('.xlsx', '').trim();
  const wb = XLSX.readFile(path.join(dir, file));
  
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Determine category from sheet name
    let category = sheetName; // QT, Malaka, OTM, Xalqaro, rahbar malaka, etc.
    
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
    
    if (headerRowIdx === -1) return;
    
    // For "rahbar malaka" sheet, the group IS the sheet name itself
    let currentGroup = sheetName;
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const firstCell = row[0];
      const secondCell = row[1];
      const thirdCell = row[2];
      const sixthCell = row[5];
      
      // Check if this is a group separator
      if (firstCell && typeof firstCell === 'string' && !secondCell && !thirdCell) {
        const cleaned = firstCell.trim();
        // Skip "Jami:", "Izoh:", and other non-group rows
        if (SKIP_GROUPS.some(s => cleaned.startsWith(s))) continue;
        if (cleaned.includes('soat bajarildi')) continue;
        if (cleaned.includes('plastik kartasi')) continue;
        if (cleaned.length > 200) continue; // Long izoh texts
        currentGroup = cleaned;
        continue;
      }
      
      const teacher = secondCell;
      const subject = thirdCell;
      const hours = sixthCell;
      
      if (teacher && typeof teacher === 'string' && teacher.length > 3 && subject && typeof hours === 'number') {
        if (teacher.includes('Jami')) continue;
        
        finalData.push({
          teacher: teacher.trim(),
          subject: subject.trim(),
          group: currentGroup,
          category: category,
          hours: hours,
          month: month
        });
      }
    }
  });
});

// Aggregate: Teacher + Subject + Group => sum hours
const aggregated = {};
finalData.forEach(row => {
  const key = `${row.teacher}||${row.subject}||${row.group}`;
  if (!aggregated[key]) {
    aggregated[key] = { 
      teacher: row.teacher, 
      subject: row.subject, 
      group: row.group, 
      totalHours: 0 
    };
  }
  aggregated[key].totalHours += row.hours;
});

const result = Object.values(aggregated).sort((a, b) => a.teacher.localeCompare(b.teacher));

// Now create a beautiful Excel using ExcelJS
async function createBeautifulExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Davomat Tizimi';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Soatlar', {
    views: [{ state: 'frozen', ySplit: 2 }]
  });
  
  // Title row
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = "O'qituvchilarning 2026-yil (Yanvar - Iyun) eski soatlari ro'yxati";
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 32;
  
  // Header row
  const headers = ["O'qituvchi F.I.Sh", "Fan nomi", "Guruh nomi", "Nazariy soat", "Amaliy soat", "Jami soat"];
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });
  headerRow.height = 28;
  
  // Column widths
  sheet.getColumn(1).width = 38;
  sheet.getColumn(2).width = 45;
  sheet.getColumn(3).width = 40;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 14;
  sheet.getColumn(6).width = 14;
  
  // Data rows
  let currentTeacher = '';
  let rowIdx = 0;
  
  result.forEach(r => {
    const nazariy = Math.ceil(r.totalHours / 2);
    const amaliy = Math.floor(r.totalHours / 2);
    
    const isNewTeacher = r.teacher !== currentTeacher;
    currentTeacher = r.teacher;
    
    const dataRow = sheet.addRow([
      r.teacher, r.subject, r.group, nazariy, amaliy, r.totalHours
    ]);
    
    const bgColor = rowIdx % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF';
    const teacherBg = isNewTeacher ? 'FFECFDF5' : bgColor;
    
    dataRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colNumber === 1 ? teacherBg : bgColor } };
      
      if (colNumber >= 4) {
        cell.alignment = { horizontal: 'center' };
        cell.font = { bold: colNumber === 6, color: { argb: colNumber === 6 ? 'FF059669' : 'FF111827' } };
      }
      if (colNumber === 1) {
        cell.font = { bold: isNewTeacher };
      }
    });
    
    rowIdx++;
  });
  
  // Summary row
  const totalHours = result.reduce((sum, r) => sum + r.totalHours, 0);
  const summaryRow = sheet.addRow(['', '', 'JAMI:', Math.ceil(totalHours / 2), Math.floor(totalHours / 2), totalHours]);
  summaryRow.eachCell((cell) => {
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'medium' }, bottom: { style: 'medium' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });
  
  const outputPath = 'C:\\Users\\Salohiddin Markaz\\Downloads\\Eski_darslar_CHIROYLI.xlsx';
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Saved to ${outputPath}`);
  console.log(`Total teachers: ${new Set(result.map(r => r.teacher)).size}`);
  console.log(`Total rows: ${result.length}`);
  console.log(`Total hours: ${totalHours}`);
}

createBeautifulExcel().catch(console.error);
