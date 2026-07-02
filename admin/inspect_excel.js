const XLSX = require('xlsx');

const filePath = "C:\\Users\\Salohiddin Markaz\\Downloads\\Telegram Desktop\\ro‘rxat.xlsx";

try {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log("SHEET NAME:", sheetName);
  console.log("ROWS:");
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    console.log(`Row ${i + 1}:`, JSON.stringify(rows[i]));
  }
} catch (e) {
  console.error("Error reading excel:", e);
}
