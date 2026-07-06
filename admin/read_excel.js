const xlsx = require('xlsx');

try {
  const filePath = 'C:\\Users\\Salohiddin Markaz\\Downloads\\Davomat_import_tayyor.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  console.log("Ustunlar (Headers):", Object.keys(data[0] || {}).join(', '));
  console.log(`\nJami qatorlar soni: ${data.length}`);
  console.log("\nBirinchi 2 ta qator:");
  console.log(JSON.stringify(data.slice(0, 2), null, 2));
} catch (e) {
  console.error("Xato yuz berdi:", e.message);
}
